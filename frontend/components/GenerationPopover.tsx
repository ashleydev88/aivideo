"use client";

import { useCourseGeneration } from "@/lib/CourseGenerationContext";
import { Loader2, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";

interface GenerationPopoverProps {
    children: React.ReactNode;
}

type StepStatus = "pending" | "active" | "completed" | "error";

const PHASES = [
    { id: "script", label: "Generating Script", icon: "✍️" },
    { id: "validation", label: "Quality Check", icon: "🔍" },
    { id: "media", label: "Creating Media", icon: "🎨" },
    { id: "compiling", label: "Compiling Video", icon: "🎬" }
];

function getPhaseStatus(currentPhase: string | null, targetPhase: string): StepStatus {
    const phaseOrder = ["script", "validation", "media", "compiling"];
    const currentIndex = phaseOrder.indexOf(currentPhase || "");
    const targetIndex = phaseOrder.indexOf(targetPhase);

    if (currentIndex === -1) return "pending";
    if (targetIndex < currentIndex) return "completed";
    if (targetIndex === currentIndex) return "active";
    return "pending";
}

function StepIndicator({ status }: { status: StepStatus }) {
    if (status === "completed") {
        return (
            <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
        );
    }
    if (status === "active") {
        return (
            <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center animate-pulse">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
        );
    }
    if (status === "error") {
        return (
            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-white" />
            </div>
        );
    }
    return (
        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
            <Circle className="w-3 h-3 text-slate-400" />
        </div>
    );
}

export function GenerationPopover({ children }: GenerationPopoverProps) {
    const { activeGeneration } = useCourseGeneration();

    if (!activeGeneration) {
        return <>{children}</>;
    }

    const { phase, currentStep, totalSteps, status } = activeGeneration;

    return (
        <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
                {children}
            </HoverCardTrigger>
            <HoverCardContent className="w-72 p-4" align="start">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                        <span className="font-semibold text-slate-900">Creating Your Course</span>
                    </div>

                    <div className="space-y-2">
                        {PHASES.map((p, index) => {
                            const stepStatus = activeGeneration.error
                                ? (p.id === phase ? "error" : getPhaseStatus(phase, p.id))
                                : getPhaseStatus(phase, p.id);
                            const isLast = index === PHASES.length - 1;

                            return (
                                <div key={p.id} className="flex items-start gap-2">
                                    <div className="flex flex-col items-center">
                                        <StepIndicator status={stepStatus} />
                                        {!isLast && (
                                            <div className={`w-0.5 h-4 ${stepStatus === "completed" ? "bg-teal-500" : "bg-slate-200"}`} />
                                        )}
                                    </div>
                                    <div className="flex-1 pb-1">
                                        <span className={`text-sm ${stepStatus === "active" ? "text-teal-700 font-medium" :
                                                stepStatus === "completed" ? "text-slate-600" :
                                                    "text-slate-400"
                                            }`}>
                                            {p.icon} {p.label}
                                        </span>
                                        {stepStatus === "active" && (phase === "media" || phase === "compiling") && totalSteps > 0 && (
                                            <div className="text-xs text-teal-600 mt-0.5">
                                                Slide {currentStep} of {totalSteps}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {activeGeneration.error && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                            {activeGeneration.error}
                        </div>
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
