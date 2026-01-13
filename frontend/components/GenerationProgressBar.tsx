"use client";

import { useCourseGeneration } from "@/lib/CourseGenerationContext";

interface GenerationProgressBarProps {
    className?: string;
}

export function GenerationProgressBar({ className = "" }: GenerationProgressBarProps) {
    const { activeGeneration } = useCourseGeneration();

    if (!activeGeneration || activeGeneration.status === "completed") {
        return null;
    }

    const { phase, currentStep, totalSteps } = activeGeneration;

    // Calculate percentage based on phase and steps
    let percentage = 0;
    if (phase === "script") {
        percentage = 5; // Script generation is ~5%
    } else if (phase === "validation") {
        percentage = 10; // Validation is ~10%
    } else if (phase === "media" && totalSteps > 0) {
        // Media generation is 10-70%
        const mediaProgress = (currentStep / totalSteps) * 60;
        percentage = 10 + mediaProgress;
    } else if (phase === "compiling" && totalSteps > 0) {
        // Compiling is 70-100%
        const compileProgress = (currentStep / totalSteps) * 30;
        percentage = 70 + compileProgress;
    }

    const gradientClass = "from-green-500 to-green-600";

    return (
        <div className={`w-full ${className}`}>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${gradientClass} transition-all duration-500 ease-out relative`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                >
                    <div className="absolute inset-0 bg-white/30 animate-pulse" />
                </div>
            </div>
            <div className="flex justify-start items-center mt-1">
                <span className="text-xs text-slate-500 lowercase">
                    in progress {Math.round(percentage)}%
                </span>
            </div>
        </div>
    );
}
