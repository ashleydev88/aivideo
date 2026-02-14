"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface AssessmentData {
    question: string;
    options: string[];
    correct_index: number;
    explanation?: string;
    points?: number;
}

export interface AssessmentCue {
    slide_number: number;
    at_ms: number;
    assessment_data: AssessmentData;
}

interface VideoAssessmentPlayerProps {
    videoUrl: string;
    assessmentCues: AssessmentCue[];
    autoPlay?: boolean;
}

export default function VideoAssessmentPlayer({ videoUrl, assessmentCues, autoPlay = true }: VideoAssessmentPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [activeCueIndex, setActiveCueIndex] = useState<number | null>(null);
    const [nextCueIndex, setNextCueIndex] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const sortedCues = useMemo(
        () => [...(assessmentCues || [])].sort((a, b) => a.at_ms - b.at_ms),
        [assessmentCues]
    );

    const handleTimeUpdate = () => {
        if (activeCueIndex !== null || nextCueIndex >= sortedCues.length) return;

        const video = videoRef.current;
        if (!video) return;

        const nextCue = sortedCues[nextCueIndex];
        const currentMs = video.currentTime * 1000;

        if (currentMs >= Math.max(0, nextCue.at_ms - 120)) {
            video.pause();
            setActiveCueIndex(nextCueIndex);
            setNextCueIndex((prev) => prev + 1);
            setSelectedIndex(null);
            setIsSubmitted(false);
        }
    };

    const continuePlayback = () => {
        setActiveCueIndex(null);
        setSelectedIndex(null);
        setIsSubmitted(false);
        const video = videoRef.current;
        if (video) {
            void video.play();
        }
    };

    const activeCue = activeCueIndex !== null ? sortedCues[activeCueIndex] : null;
    const assessment = activeCue?.assessment_data;
    const isCorrect = selectedIndex !== null && selectedIndex === assessment?.correct_index;

    return (
        <div className="aspect-video relative flex items-center justify-center bg-black">
            <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full h-full"
                playsInline
                autoPlay={autoPlay}
                onTimeUpdate={handleTimeUpdate}
            >
                Your browser does not support the video tag.
            </video>

            {assessment && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Assessment</p>
                        <h3 className="text-xl font-bold text-slate-900 mb-4">{assessment.question}</h3>

                        <div className="space-y-2 mb-4">
                            {assessment.options.map((option, idx) => (
                                <button
                                    key={`assessment-choice-${idx}`}
                                    type="button"
                                    onClick={() => !isSubmitted && setSelectedIndex(idx)}
                                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                                        selectedIndex === idx
                                            ? "border-teal-600 bg-teal-50 text-teal-900"
                                            : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                                    }`}
                                >
                                    <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>
                                    {option}
                                </button>
                            ))}
                        </div>

                        {isSubmitted && (
                            <div className={`mb-4 text-sm ${isCorrect ? "text-emerald-700" : "text-amber-700"}`}>
                                <p className="font-semibold">{isCorrect ? "Correct." : "Not quite."}</p>
                                {assessment.explanation && <p className="mt-1">{assessment.explanation}</p>}
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            {!isSubmitted ? (
                                <Button
                                    onClick={() => setIsSubmitted(true)}
                                    disabled={selectedIndex === null}
                                    className="bg-teal-600 hover:bg-teal-700"
                                >
                                    Submit
                                </Button>
                            ) : (
                                <Button onClick={continuePlayback} className="bg-teal-600 hover:bg-teal-700">
                                    Continue
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
