"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { SeamlessPlayer, Slide } from "@/components/SeamlessPlayer";

interface Project {
    id: string;
    name: string;
    video_url?: string;
    slide_data?: Slide[];
    status: string;
}

function PlayerContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get("id");
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState<Project | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    // Helper to get fresh signed URL for video playback
    const getSignedUrl = async (path: string, token: string): Promise<string | null> => {
        // If it's already a full URL (legacy), try to use it directly
        // The backend will return it as-is or the video element will fail gracefully
        if (path.startsWith("http")) {
            // For legacy URLs, still try to get a fresh one via backend
            // This handles the case where the stored URL is expired
            try {
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
                const response = await fetch(`${API_BASE_URL}/api/course/get-signed-url`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({ path }),
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.signed_url;
                }
            } catch (err) {
                console.warn("Failed to refresh legacy URL, using original:", err);
            }
            return path; // Fallback to original URL
        }

        // New format: storage path - get fresh signed URL
        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${API_BASE_URL}/api/course/get-signed-url`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ path }),
            });

            if (!response.ok) {
                throw new Error("Failed to get signed URL");
            }

            const data = await response.json();
            return data.signed_url;
        } catch (err) {
            console.error("Error getting signed URL:", err);
            return null;
        }
    };

    useEffect(() => {
        const fetchProject = async () => {
            if (!id) {
                setError("No project ID provided");
                setLoading(false);
                return;
            }

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push("/login");
                    return;
                }

                const { data, error } = await supabase
                    .from("courses")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error("Project not found");

                setProject(data);

                // If there's a video, get a fresh signed URL
                if (data.video_url) {
                    const freshUrl = await getSignedUrl(data.video_url, session.access_token);
                    setVideoUrl(freshUrl);
                }
            } catch (err: any) {
                console.error("Error fetching project:", err);
                setError(err.message || "Failed to load project");
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [id, router, supabase]);

    // Effect to mark as viewed
    useEffect(() => {
        if (project?.status === "completed" && id) {
            const markViewed = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                try {
                    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
                    await fetch(`${API_BASE_URL}/api/course/course/${id}/mark-viewed`, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    });
                } catch (e) {
                    console.error("Failed to mark as viewed", e);
                }
            };
            markViewed();
        }
    }, [project, id, supabase]);

    if (loading) {
        return <LoadingScreen message="Loading player..." />;
    }

    if (error || !project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h2 className="text-xl font-semibold text-slate-900">Error Loading Project</h2>
                <p className="text-slate-500">{error || "Project could not be found"}</p>
                <Button onClick={() => router.push("/dashboard")}>
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    // Determine which player to show
    const hasVideo = !!videoUrl;
    const hasSlides = project.slide_data && project.slide_data.length > 0;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => router.push("/dashboard")}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            </div>

            <Card className="overflow-hidden bg-black/5 border-slate-200">
                <CardContent className="p-0">
                    {hasVideo ? (
                        /* Prefer pre-rendered video if available */
                        <div className="aspect-video flex items-center justify-center bg-black">
                            <video
                                src={videoUrl}
                                controls
                                className="w-full h-full"
                                playsInline
                                autoPlay
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    ) : hasSlides ? (
                        /* Use seamless player with slide_data */
                        <SeamlessPlayer slides={project.slide_data!} autoPlay={true} />
                    ) : (
                        /* No content available */
                        <div className="aspect-video flex items-center justify-center bg-black">
                            <div className="text-center text-white/50">
                                <p>No content available for this project.</p>
                                <p className="text-sm mt-2">Status: {project.status}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function PlayerPage() {
    return (
        <Suspense fallback={<LoadingScreen message="Initializing player..." />}>
            <PlayerContent />
        </Suspense>
    );
}
