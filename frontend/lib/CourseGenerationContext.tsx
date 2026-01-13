"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// --- Types ---
export interface GenerationProgress {
    courseId: string;
    status: string;
    phase: "script" | "validation" | "media" | "compiling" | null;
    currentStep: number;
    totalSteps: number;
    error: string | null;
    videoUrl: string | null;
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
    const [activeGeneration, setActiveGeneration] = useState<GenerationProgress | null>(null);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Restore from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.courseId && parsed.status !== "completed" && parsed.status !== "error") {
                    setActiveGeneration(parsed);
                } else {
                    // Clear stale data
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    // Persist to localStorage whenever activeGeneration changes
    useEffect(() => {
        if (activeGeneration) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(activeGeneration));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [activeGeneration]);

    // Polling logic
    const pollStatus = useCallback(async (courseId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`http://127.0.0.1:8000/status/${courseId}?t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
                cache: "no-store"
            });

            if (res.status === 404) {
                setActiveGeneration(prev => prev ? { ...prev, error: "Course not found", status: "error" } : null);
                return;
            }

            const data = await res.json();

            setActiveGeneration(prev => ({
                courseId,
                status: data.status || "processing",
                phase: data.progress_phase || null,
                currentStep: data.progress_current_step || 0,
                totalSteps: data.progress_total_steps || 0,
                error: data.status === "failed" || data.status === "error" ? "Generation failed" : null,
                videoUrl: data.video_url || null
            }));

            // Clear if completed or failed
            if (data.status === "completed" || data.status === "failed" || data.status === "error") {
                if (pollInterval.current) {
                    clearInterval(pollInterval.current);
                    pollInterval.current = null;
                }
            }
        } catch (e) {
            console.error("Polling error:", e);
        }
    }, [supabase]);

    // Start/stop polling based on activeGeneration
    useEffect(() => {
        if (activeGeneration?.courseId && !activeGeneration.error && activeGeneration.status !== "completed") {
            // Start polling
            pollStatus(activeGeneration.courseId);
            pollInterval.current = setInterval(() => {
                pollStatus(activeGeneration.courseId);
            }, 2000);
        }

        return () => {
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = null;
            }
        };
    }, [activeGeneration?.courseId, pollStatus]);

    const startGeneration = useCallback((courseId: string) => {
        setActiveGeneration({
            courseId,
            status: "Initializing...",
            phase: "script",
            currentStep: 0,
            totalSteps: 0,
            error: null,
            videoUrl: null
        });
    }, []);

    const clearGeneration = useCallback(() => {
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
        }
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
