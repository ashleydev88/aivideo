"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// --- Types ---
export interface GenerationProgress {
    courseId: string;
    status: string;
    phase: "script" | "validation" | "media" | "compiling" | null;
    progress: number;
    error: string | null;
    videoUrl: string | null;
    slideData: unknown[] | null;
}

interface CourseGenerationContextType {
    activeGeneration: GenerationProgress | null;
    startGeneration: (courseId: string) => void;
    clearGeneration: () => void;
    isGenerating: boolean;
}

const STORAGE_KEY = "active_course_generation";

const CourseGenerationContext = createContext<CourseGenerationContextType | null>(null);

export function useCourseGeneration() {
    const context = useContext(CourseGenerationContext);
    if (!context) {
        throw new Error("useCourseGeneration must be used within a CourseGenerationProvider");
    }
    return context;
}

export function CourseGenerationProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const [activeGeneration, setActiveGeneration] = useState<GenerationProgress | null>(() => {
        if (typeof window === "undefined") return null;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        try {
            const parsed = JSON.parse(stored) as GenerationProgress;
            if (parsed.courseId && parsed.status !== "completed" && parsed.status !== "error") {
                return parsed;
            }
            localStorage.removeItem(STORAGE_KEY);
            return null;
        } catch {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    });
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Persist to localStorage whenever activeGeneration changes
    useEffect(() => {
        if (activeGeneration) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(activeGeneration));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [activeGeneration]);

    // Realtime Subscription Logic
    useEffect(() => {
        const courseId = activeGeneration?.courseId;
        const status = activeGeneration?.status;

        // Only subscribe if we have a course that is processing
        const shouldSubscribe = courseId &&
            status !== "completed" &&
            status !== "error" &&
            status !== "failed" &&
            !activeGeneration?.error; // Don't subscribe if we hit a hard error

        if (!shouldSubscribe) {
            // Cleanup if we're done or errored
            return;
        }

        console.log(`🔌 Subscribing to updates for course: ${courseId}`);

        const channel = supabase
            .channel(`course-${courseId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'courses',
                    filter: `id=eq.${courseId}`
                },
                (payload) => {
                    const newData = payload.new;
                    console.log("⚡ Realtime Update:", newData.status, newData.progress_phase);

                    setActiveGeneration(prev => {
                        if (!prev || prev.courseId !== courseId) return prev;

                        return {
                            ...prev,
                            status: newData.status || prev.status,
                            phase: newData.progress_phase || prev.phase,
                            progress: newData.progress !== undefined ? newData.progress : prev.progress,
                            videoUrl: newData.video_url || prev.videoUrl,
                            slideData: newData.slide_data || prev.slideData,
                            error: (newData.status === "failed" || newData.status === "error")
                                ? "Generation failed"
                                : null
                        };
                    });
                }
            )
            .subscribe();

        // Initial fetch to ensure we're in sync (in case we missed an event while mounting)
        const fetchInitialState = async () => {
            const { data, error } = await supabase.from('courses').select('*').eq('id', courseId).single();
            if (data && !error) {
                setActiveGeneration(prev => ({
                    ...prev!,
                    status: data.status,
                    phase: data.progress_phase,
                    progress: data.progress || 0,
                    videoUrl: data.video_url,
                    slideData: data.slide_data,
                    error: (data.status === "failed" || data.status === "error") ? "Generation failed" : null
                }));
            }
        };
        fetchInitialState();

        return () => {
            console.log(`🔌 Unsubscribing from course: ${courseId}`);
            supabase.removeChannel(channel);
        };
    }, [activeGeneration?.courseId, activeGeneration?.status, activeGeneration?.error, supabase]);

    const startGeneration = useCallback((courseId: string) => {
        setActiveGeneration({
            courseId,
            status: "Initializing...",
            phase: "script",
            progress: 0,
            error: null,
            videoUrl: null,
            slideData: null
        });
    }, []);

    const clearGeneration = useCallback(() => {
        setActiveGeneration(null);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const isGenerating = Boolean(
        activeGeneration &&
        activeGeneration.status !== "completed" &&
        !activeGeneration.error
    );

    return (
        <CourseGenerationContext.Provider value={{ activeGeneration, startGeneration, clearGeneration, isGenerating }}>
            {children}
        </CourseGenerationContext.Provider>
    );
}
