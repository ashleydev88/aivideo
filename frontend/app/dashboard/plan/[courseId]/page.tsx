"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlanningEditor from "@/components/PlanningEditor";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Topic {
    id: number;
    title: string;
    purpose: string;
    key_points: string[];
}

export default function PlanPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const fetchCourse = async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("courses")
                .select("*")
                .eq("id", courseId)
                .single();

            if (error) {
                console.error("Error fetching course:", error);
                setError("Failed to load course plan.");
            } else {
                setCourse(data);
                // If already past planning, redirect?
                // e.g. status "generating_structure" or "reviewing_structure" -> go to structure page
                if (['generating_structure', 'reviewing_structure', 'finalizing_assets', 'completed'].includes(data.status)) {
                    router.push(`/dashboard/structure/${courseId}`);
                }
            }
            setLoading(false);
        };

        fetchCourse();

        // Poll for completion of topic generation if status is 'generating_topics'
        const interval = setInterval(async () => {
            const supabase = createClient();
            const { data } = await supabase.from("courses").select("status, metadata, name").eq("id", courseId).single();
            if (data && data.status !== 'generating_topics') {
                // Refresh data when complete
                const { data: fullData } = await supabase.from("courses").select("*").eq("id", courseId).single();
                setCourse(fullData);
            }
        }, 3000);
        return () => clearInterval(interval);

    }, [courseId, router]);

    const handleNext = async (updatedTopics: Topic[], updatedTitle: string, updatedLearningObjective: string) => {
        setIsGenerating(true);
        try {
            const supabase = createClient();
            const session = (await supabase.auth.getSession()).data.session;

            if (!session) throw new Error("No session");

            // Prepare request
            // Note: PlanRequest generates topics. ScriptRequest generates structure.
            // We need to match ScriptRequest structure expected by /generate-structure
            // It expects:
            // user_id, topics, duration, style, title, learning_objective, policy_text, country, course_id

            // We need to pull missing fields from existing course data (policy_text, style, etc from metadata?)
            // Wait, metadata has "processed_policy" but maybe not original?
            // "processed_policy" is stored in metadata.

            // We need "style". It might not be selected yet? 
            // The original create flow asked for style. If we removed that, we need to ask for it here or default it.
            // SetupForm (dashboard/create/page.tsx) asks for style.

            // Let's assume style was stored in metadata during create/generate-topics?
            // In generate-topics endpoint, we stored: duration, country. status=generating_topics.
            // We did NOT store style. SetupForm asks for style?
            // If SetupForm calls /generate-topics, does it pass style? 
            // PlanRequest has: policy_text, duration, country. NO STYLE.

            // So we need to ask for style here OR update generate-topics to accept/store style.
            // Or use a default.
            // For now, let's use a default "Minimalist Vector" if missing, or maybe current metadata has it?

            // We should ideally allow user to pick style here if not picked yet.
            // But PlanningEditor doesn't have style picker.

            // Fix: Add style to metadata in SetupForm -> /generate-topics if possible?
            // Or assume default for now.

            /*
            class ScriptRequest(BaseModel):
                user_id: str
                topics: List[Topic]
                style: str
                duration: int
                title: str
                learning_objective: str
                policy_text: str  <-- We need this.
                country: str
                accent_color: str = None
                color_name: str = None
                course_id: str = None
            */

            const payload = {
                user_id: session.user.id,
                course_id: courseId,
                topics: updatedTopics,
                title: updatedTitle,
                learning_objective: updatedLearningObjective || course.metadata.learning_objective || "Course Objective",
                duration: course.metadata.duration,
                country: course.metadata.country,
                policy_text: course.metadata.processed_policy || "Policy text missing",
                style: course.metadata.style || "Minimalist Vector",
                accent_color: course.metadata.accent_color,
                color_name: course.metadata.color_name
            };

            const res = await fetch("http://127.0.0.1:8000/generate-structure", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ detail: "Unknown error" }));
                console.error("Structure generation failed:", errData);
                throw new Error(errData.detail || "Failed to generate structure");
            }

            // Success
            router.push('/dashboard');

        } catch (error: any) {
            console.error("HandleNext Error:", error);
            setError(error.message || "Failed to start design phase");
            setIsGenerating(false);
            alert(`Error: ${error.message || "Failed"}`);
        }
    };

    if (loading) {
        return <div className="flex h-[50vh] justify-center items-center"><Loader2 className="animate-spin" /></div>;
    }

    if (course?.status === 'generating_topics') {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4 text-center px-4">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-teal-100 blur-xl animate-pulse" />
                    <Loader2 className="relative h-16 w-16 text-teal-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold mt-4">Analysing Policy...</h2>
                <p className="text-muted-foreground max-w-md">
                    We are extracting key insights and designing your learning path.
                </p>
            </div>
        );
    }

    if (!course) return <div>Course not found</div>;

    return (
        <div className="container py-8">
            <PlanningEditor
                topics={course.metadata.topics || []}
                duration={course.metadata.duration}
                initialTitle={course.name}
                initialLearningObjective={course.metadata.learning_objective}
                onBack={() => router.push("/dashboard")}
                onNext={handleNext}
                isLoading={isGenerating}
            />
        </div>
    );
}
