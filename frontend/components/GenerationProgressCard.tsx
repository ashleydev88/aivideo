"use client";

import { useCourseGeneration } from "@/lib/CourseGenerationContext";
import { Loader2, Video, FileText, Palette, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

export function GenerationProgressCard() {
    const { activeGeneration, isGenerating } = useCourseGeneration();
    const [progress, setProgress] = useState(0);

    // Calculate overall progress percentage for the UI bar
    useEffect(() => {
        if (!activeGeneration) {
            setProgress(0);
            return;
        }

        const { phase, currentStep, totalSteps, status } = activeGeneration;

        if (status === "completed") {
            setProgress(100);
            return;
        }

        let calculated = 0;

        if (phase === "script") {
            // Phase 1: Scripting (0-20%) - Indeterminate mostly
            calculated = 10;
        } else if (phase === "validation") {
            // Phase 1.5: Validation (20-25%)
            calculated = 25;
        } else if (phase === "media") {
            // Phase 2: Media/Assets (25-80%)
            // The backend might report more steps (bookends) than we expect, so we cap the currentStep at totalSteps
            const effectiveTotal = totalSteps || 1;
            const progressFraction = Math.min(currentStep / effectiveTotal, 1);
            calculated = 25 + (progressFraction * 55);
        } else if (phase === "compiling") {
            // Phase 3: Rendering (80-100%)
            // Rendering is 0-100% of the last 20%
            // Ensure we don't go over 100 even if the backend behaves oddly
            const renderProgress = Math.min((currentStep / 100), 1) * 20;
            calculated = 80 + renderProgress;
        }

        // Smoothly animate to new value (simple approach via CSS transition on component)
        // CRITICAL FIX: Clamp at 99% and ensure it doesn't exceed 100%
        setProgress(Math.min(calculated, 99)); // Cap at 99 until truly done
    }, [activeGeneration]);

    if (!isGenerating || !activeGeneration) return null;

    const { phase, status, currentStep, totalSteps } = activeGeneration;

    const getPhaseIcon = () => {
        if (phase === "script" || phase === "validation") return <FileText className="w-6 h-6 text-teal-600" />;
        if (phase === "media") return <Palette className="w-6 h-6 text-purple-600" />;
        // FIX: Ensure compiling shows video icon
        if (phase === "compiling" || status?.toLowerCase().includes("rendering")) return <Video className="w-6 h-6 text-blue-600" />;
        return <Loader2 className="w-6 h-6 animate-spin text-slate-400" />;
    };

    const getPhaseLabel = () => {
        if (phase === "script") return " drafting script...";
        if (phase === "validation") return " validating policy compliance...";
        if (phase === "media") return ` creating visuals (slide ${currentStep}/${totalSteps})...`; // Use local consts
        if (phase === "compiling") return ` rendering video (${activeGeneration.currentStep}%)...`;
        return status;
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-xl p-5 w-[400px] ring-1 ring-slate-900/5">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 shadow-sm">
                        {getPhaseIcon()}
                    </div>
                    <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-slate-900">Generating Course</h4>
                            <span className="text-xs font-mono font-medium text-slate-500">{Math.round(progress)}%</span>
                        </div>

                        <Progress value={progress} className="h-2" />

                        <p className="text-sm text-slate-600 font-medium">
                            {activeGeneration.courseId.slice(0, 8)}... —
                            <span className="text-slate-500 font-normal">{getPhaseLabel()}</span>
                        </p>

                        {/* Safe to leave message - only show if not nearly done */}
                        {progress < 90 && (
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Safe to close. We'll email you when done.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
