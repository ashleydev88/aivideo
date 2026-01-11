"use client";

import { Loader2, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface CourseGenerationModalProps {
    isOpen: boolean;
    currentPhase: "script" | "designing";
    statusText: string;
    error?: string | null;
    onRetry?: () => void;
}

type StepStatus = "pending" | "active" | "completed" | "error";

interface Step {
    id: string;
    label: string;
    description: string;
}

const STEPS: Step[] = [
    {
        id: "script",
        label: "Generating Script",
        description: "Creating your narration and visual plan",
    },
    {
        id: "validation",
        label: "Quality Check",
        description: "Validating content accuracy and flow",
    },
    {
        id: "media",
        label: "Creating Media",
        description: "Generating audio narration and visuals",
    },
    {
        id: "finalizing",
        label: "Preparing Course",
        description: "Assembling your final training video",
    },
];

function getStepStatuses(
    currentPhase: "script" | "designing",
    statusText: string,
    error: string | null
): Record<string, StepStatus> {
    const statuses: Record<string, StepStatus> = {
        script: "pending",
        validation: "pending",
        media: "pending",
        finalizing: "pending",
    };

    if (error) {
        // Find the active step and mark it as error
        if (currentPhase === "script") {
            statuses.script = "error";
        } else {
            const lower = statusText.toLowerCase();
            if (lower.includes("drafting slide") || lower.includes("generating audio")) {
                statuses.script = "completed";
                statuses.validation = "completed";
                statuses.media = "error";
            } else if (lower.includes("validat")) {
                statuses.script = "completed";
                statuses.validation = "error";
            } else {
                statuses.script = "completed";
                statuses.validation = "completed";
                statuses.media = "error";
            }
        }
        return statuses;
    }

    // Phase 1: Script generation (before backend task starts)
    if (currentPhase === "script") {
        statuses.script = "active";
        return statuses;
    }

    // Phase 2: Designing (backend task running)
    const lower = statusText.toLowerCase();

    // Completed
    if (lower === "completed") {
        statuses.script = "completed";
        statuses.validation = "completed";
        statuses.media = "completed";
        statuses.finalizing = "completed";
        return statuses;
    }

    // Finalizing
    if (lower.includes("final") || lower.includes("preparing") || lower.includes("assembling")) {
        statuses.script = "completed";
        statuses.validation = "completed";
        statuses.media = "completed";
        statuses.finalizing = "active";
        return statuses;
    }

    // Media generation (Drafting slides)
    if (lower.includes("drafting slide") || lower.includes("generating audio") || lower.includes("creating slide")) {
        statuses.script = "completed";
        statuses.validation = "completed";
        statuses.media = "active";
        return statuses;
    }

    // Validation
    if (lower.includes("validat") || lower.includes("checking") || lower.includes("quality")) {
        statuses.script = "completed";
        statuses.validation = "active";
        return statuses;
    }

    // Default: still in script phase within designing (generating_script status)
    if (lower.includes("generating_script") || lower.includes("initializing") || lower === "initializing...") {
        statuses.script = "active";
        return statuses;
    }

    // Fallback - assume we're past script
    statuses.script = "completed";
    statuses.validation = "active";
    return statuses;
}

function StepIndicator({ status }: { status: StepStatus }) {
    if (status === "completed") {
        return (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30 transition-all duration-500">
                <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
        );
    }

    if (status === "active") {
        return (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/50 animate-pulse transition-all duration-500">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <AlertCircle className="w-5 h-5 text-white" />
            </div>
        );
    }

    // Pending
    return (
        <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center transition-all duration-500">
            <Circle className="w-4 h-4 text-slate-300" />
        </div>
    );
}

function getActiveStepDescription(statusText: string, stepId: string): string {
    // Show dynamic status for media step
    if (stepId === "media" && statusText.toLowerCase().includes("drafting slide")) {
        return statusText;
    }
    return "";
}

export default function CourseGenerationModal({
    isOpen,
    currentPhase,
    statusText,
    error,
    onRetry,
}: CourseGenerationModalProps) {
    const stepStatuses = getStepStatuses(currentPhase, statusText, error || null);

    return (
        <Dialog open={isOpen}>
            <DialogContent
                hideCloseButton
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                className="sm:max-w-lg p-0 overflow-hidden"
            >
                {/* Header with Gradient */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                            <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        </div>
                    </div>
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-2xl font-bold text-white">
                            Creating Your Course
                        </DialogTitle>
                        <DialogDescription className="text-teal-100 text-base">
                            Sit back while we craft your personalized training video
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Progress Steps */}
                <div className="p-6 space-y-0">
                    {STEPS.map((step, index) => {
                        const status = stepStatuses[step.id];
                        const isLast = index === STEPS.length - 1;
                        const dynamicDescription = getActiveStepDescription(statusText, step.id);

                        return (
                            <div key={step.id} className="relative">
                                <div className="flex items-start gap-4">
                                    {/* Step Indicator & Line */}
                                    <div className="flex flex-col items-center">
                                        <StepIndicator status={status} />
                                        {!isLast && (
                                            <div
                                                className={`w-0.5 h-10 transition-all duration-700 ease-out ${status === "completed"
                                                        ? "bg-gradient-to-b from-teal-500 to-teal-400"
                                                        : "bg-slate-200"
                                                    }`}
                                            />
                                        )}
                                    </div>

                                    {/* Step Content */}
                                    <div className="flex-1 pb-6">
                                        <h4
                                            className={`font-semibold text-base transition-colors duration-300 ${status === "active"
                                                    ? "text-teal-700"
                                                    : status === "completed"
                                                        ? "text-slate-700"
                                                        : status === "error"
                                                            ? "text-red-600"
                                                            : "text-slate-400"
                                                }`}
                                        >
                                            {step.label}
                                            {status === "active" && (
                                                <span className="ml-2 inline-flex items-center">
                                                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                                                </span>
                                            )}
                                        </h4>
                                        <p
                                            className={`text-sm transition-colors duration-300 mt-0.5 ${status === "active"
                                                    ? "text-teal-600"
                                                    : status === "completed"
                                                        ? "text-slate-500"
                                                        : status === "error"
                                                            ? "text-red-500"
                                                            : "text-slate-400"
                                                }`}
                                        >
                                            {dynamicDescription || step.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Error State */}
                {error && (
                    <div className="px-6 pb-6">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                            <p className="text-red-600 font-medium mb-3">{error}</p>
                            {onRetry && (
                                <button
                                    onClick={onRetry}
                                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all hover:shadow-lg"
                                >
                                    Start Over
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Warning Alert */}
                {!error && (
                    <div className="px-6 pb-6">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-sm text-amber-700 text-center font-medium">
                                ⚠️ This may take up to 5 minutes. Please do not close this window.
                            </p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
