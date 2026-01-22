"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SlideEditor from "@/components/SlideEditor/SlideEditor";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StructurePage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

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
                setError("Failed to load course.");
            } else {
                setCourse(data);
                // Redirect if not in correct state?
                // Allowed states: generating_structure, reviewing_structure
                // If finalized, maybe redirect to dashboard?
                if (data.status === 'completed') {
                    router.push('/dashboard');
                }
            }
            setLoading(false);
        };

        fetchCourse();

        // Polling for updates if status is generating_structure
        let interval: NodeJS.Timeout;
        if (course?.status === 'generating_structure') {
            interval = setInterval(async () => {
                const supabase = createClient();
                const { data } = await supabase.from("courses").select("status, slide_data").eq("id", courseId).single();
                // Check if status changed or if we hit a terminal state in DB
                if (data && data.status !== course?.status) {
                    setCourse((prev: any) => ({ ...prev, ...data }));
                }
            }, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };

    }, [courseId, router, course?.status]); // Add course?.status dependency to update local state logic? existing logic works fine

    if (loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <p className="text-destructive font-medium">{error || "Course not found"}</p>
                <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
            </div>
        );
    }

    if (course.status === "generating_structure") {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4 text-center px-4">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-blue-100 blur-xl animate-pulse" />
                    <Loader2 className="relative h-16 w-16 text-blue-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold mt-4">Drafting Course Structure...</h2>
                <p className="text-muted-foreground max-w-md">
                    Our AI is writing the script, designing slides, and planning visuals. This usually takes about 30 seconds.
                </p>
                <div className="w-full max-w-xs bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                    <div className="h-full bg-blue-500 animate-progress origin-left" style={{ width: '60%' }} />
                </div>
            </div>
        );
    }

    // Default to Editor
    return (
        <div className="container max-w-[1600px] mx-auto py-6 px-4">
            <SlideEditor
                courseId={courseId}
                initialSlides={course.slide_data || []}
                onFinalize={() => router.push('/dashboard')}
            />
        </div>
    );
}
