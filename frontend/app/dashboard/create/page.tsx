"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import SetupForm from '@/components/SetupForm';
import PlanningEditor from '@/components/PlanningEditor';
import ProcessingModal from '@/components/ProcessingModal';
import { createClient } from '@/lib/supabase/client';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCourseGeneration } from '@/lib/CourseGenerationContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket } from "lucide-react";

// --- INTERFACES ---
interface Slide {
    id: number;
    image: string;
    audio: string;
    duration: number;
    visual_text?: string;
    layout?: 'split' | 'text_only' | 'image_only';
}

export interface Topic {
    id: number;
    title: string;
    purpose: string;
    key_points: string[];
}

const RichTextRenderer = ({ text }: { text: string }) => {
    // ... (keep RichTextRenderer as is)
    if (!text) return null;
    const lines = text.split('\n');
    // Filter out empty lines to get accurate count for animation delays
    const nonEmptyLines = lines.filter(line => line.trim());
    let lineIndex = 0;

    return (
        <div className="space-y-6">
            {lines.map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return null;

                // Calculate stagger delay for this line
                const currentLineIndex = lineIndex++;
                const animationDelay = `${currentLineIndex * 0.25}s`;

                if (trimmed.startsWith('#')) {
                    return (
                        <div
                            key={i}
                            className="w-fit text-animate-in"
                            style={{ animationDelay }}
                        >
                            <h2 className="text-4xl font-bold text-slate-900 leading-tight mb-2">{trimmed.replace(/^#\s*/, '')}</h2>
                            <div className="w-full h-2 bg-teal-600 rounded-full"></div>
                        </div>
                    );
                }

                if (trimmed.startsWith('>') || trimmed.startsWith('"')) {
                    return (
                        <div
                            key={i}
                            className="pl-6 border-l-4 border-teal-500 italic text-2xl text-slate-600 font-serif text-animate-in"
                            style={{ animationDelay }}
                        >
                            "{trimmed.replace(/^[>"]+/, '').replace(/"$/, '').trim()}"
                        </div>
                    );
                }

                return (
                    <div
                        key={i}
                        className="flex items-start gap-4 text-animate-in"
                        style={{ animationDelay }}
                    >
                        {trimmed.startsWith('-') && (
                            <div className="mt-1.5 text-teal-600 shrink-0">
                                <CheckCircle2 size={24} strokeWidth={3} />
                            </div>
                        )}
                        <p className="text-slate-700 font-medium text-xl leading-relaxed">
                            {trimmed.replace(/^-/, '').trim().split(/(\*\*.*?\*\*)/).map((part, index) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                    return <strong key={index} className="text-slate-900 font-bold">{part.slice(2, -2)}</strong>;
                                }
                                return <span key={index}>{part}</span>;
                            })}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

// Ken Burns effect variations
const KEN_BURNS_EFFECTS = [
    'ken-burns-zoom-in',
    'ken-burns-zoom-out',
    'ken-burns-pan-left',
    'ken-burns-pan-right',
    'ken-burns-pan-up',
    'ken-burns-pan-down'
] as const;

// --- PLAYER COMPONENT (Split Screen) ---
function SeamlessPlayer({ slides = [], onReset, videoUrl }:
    { slides: Slide[], onReset: () => void, videoUrl?: string }) {

    const [index, setIndex] = useState(0);
    const [hasStarted, setHasStarted] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Randomly assign Ken Burns effect to each slide (memoized for consistency)
    const slideEffects = useMemo(() =>
        slides.map(() => KEN_BURNS_EFFECTS[Math.floor(Math.random() * KEN_BURNS_EFFECTS.length)]),
        [slides.length]
    );

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
        return <div className="text-slate-600 p-4">Waiting for slide data...</div>;
    }

    useEffect(() => {
        if (index < slides.length - 1) {
            const nextImg = new Image();
            if (slides[index + 1]) nextImg.src = slides[index + 1].image;
        }
    }, [index, slides]);

    useEffect(() => {
        if (hasStarted && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.load();
            audioRef.current.play().catch((error) => console.error("Autoplay blocked:", error));
        }
    }, [index, hasStarted]);

    const handleNext = useCallback(() => {
        setIndex((currentIndex) => {
            if (currentIndex < slides.length - 1) return currentIndex + 1;
            return currentIndex;
        });
    }, [slides.length]);

    useEffect(() => {
        if (!hasStarted) return;
        const duration = slides[index]?.duration || 15000;
        const timer = setTimeout(handleNext, duration);
        return () => clearTimeout(timer);
    }, [index, slides, handleNext, hasStarted]);

    const startCourse = () => {
        setHasStarted(true);
        if (audioRef.current) audioRef.current.play().catch(e => console.error("Initial play failed", e));
    };

    const handleDownload = async () => {
        if (!videoUrl) return;
        setIsDownloading(true);
        try {
            const response = await fetch(videoUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "Training_Course.mp4";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error("Download failed", e);
            window.open(videoUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    const currentSlide = slides[index];
    const layout = currentSlide.layout || 'split';

    // Decide Layout Logic
    const showText = layout !== 'image_only' && !!currentSlide.visual_text;
    const showImage = layout !== 'text_only';

    // If video is ready, show the compiled MP4 directly
    if (videoUrl) {
        return (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
                <div className="relative w-[800px] h-[450px] bg-black overflow-hidden border border-slate-200 rounded-xl shadow-2xl ring-1 ring-slate-900/5">
                    <video
                        src={videoUrl}
                        controls
                        autoPlay
                        className="w-full h-full"
                        playsInline
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>

                <div className="flex justify-between items-center w-[800px]">
                    <button onClick={onReset} className="text-slate-500 hover:text-slate-900 font-medium text-sm flex items-center gap-1 transition-colors">
                        ← Back to Library
                    </button>

                    <button onClick={handleDownload} disabled={isDownloading} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition font-medium">
                        {isDownloading ? (
                            <span className="flex items-center gap-2">Saving...</span>
                        ) : (
                            <>Download Video</>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // Fallback: Show slide-based preview while video is compiling
    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
            <div className="relative w-[800px] h-[450px] bg-slate-50 overflow-hidden border border-slate-200 rounded-xl shadow-2xl group flex ring-1 ring-slate-900/5">

                {/* TEXT SIDE (Or Full Center) */}
                {showText && (
                    <div className={`
                flex flex-col justify-center p-12 transition-all duration-500 h-full z-10
                ${layout === 'text_only' ? 'w-full items-center text-center' : 'w-1/2 bg-slate-50'}
                ${layout === 'split' ? 'animate-in fade-in slide-in-from-left-4' : ''}
            `}>
                        <div className={`${layout === 'text_only' ? 'max-w-2xl' : ''}`}>
                            <RichTextRenderer text={currentSlide.visual_text || ""} />
                        </div>
                    </div>
                )}

                {/* IMAGE SIDE (Or Full) */}
                {showImage && (
                    <div className={`
                relative h-full transition-all duration-700 ease-in-out overflow-hidden
                ${layout === 'split' ? 'w-1/2' : 'w-full absolute inset-0'} 
            `}>
                        {slides.map((slide, i) => (
                            <img
                                key={`${i}-${index}`}
                                src={slide.image}
                                className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 
                    ${i === index ? `opacity-100 ${slideEffects[i]}` : "opacity-0"}`}
                                style={{
                                    '--slide-duration': `${(slide.duration || 15000) / 1000}s`
                                } as React.CSSProperties}
                                alt={`Slide ${i + 1}`}
                            />
                        ))}
                    </div>
                )}

                <audio ref={audioRef} src={currentSlide?.audio} preload="auto" />

                {!hasStarted && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                        <button
                            onClick={startCourse}
                            className="flex items-center gap-3 bg-teal-700 hover:bg-teal-600 text-white px-8 py-4 rounded-full font-bold text-xl transition-all hover:scale-105 shadow-xl hover:shadow-2xl ring-4 ring-teal-700/20"
                        >
                            <PlayCircle size={24} />
                            Start Course
                        </button>
                    </div>
                )}

                <div className="absolute bottom-4 right-4 text-xs font-medium text-slate-500 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm z-20 border border-slate-200">
                    Slide {index + 1} of {slides.length}
                </div>
            </div>

            <div className="flex justify-between items-center w-[800px]">
                <button onClick={onReset} className="text-slate-500 hover:text-slate-900 font-medium text-sm flex items-center gap-1 transition-colors">
                    ← Back to Library
                </button>

                <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 text-slate-500 font-medium">
                    <span className="animate-pulse">●</span> Video compiling...
                </div>
            </div>
        </div>
    );
}

// --- MAIN PAGE ---
function DashboardCreatePageContent() {
    const [view, setView] = useState<"setup" | "planning" | "designing">("setup");
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const [session, setSession] = useState<any>(null);
    const searchParams = useSearchParams();
    const initialId = searchParams.get('id');

    // Data State
    const [policyText, setPolicyText] = useState("");
    const [duration, setDuration] = useState(3);
    const [style, setStyle] = useState("Minimalist Vector");
    const [topics, setTopics] = useState<Topic[]>([]);
    const [title, setTitle] = useState("New Course"); // NEW: Title State
    const [learningObjective, setLearningObjective] = useState(""); // NEW: LO State
    const [courseId, setCourseId] = useState<string | null>(null);
    const [country, setCountry] = useState<"USA" | "UK">("USA");
    const [accentColor, setAccentColor] = useState("#14b8a6"); // Default teal
    const [colorName, setColorName] = useState("teal");

    // Status State
    const [statusText, setStatusText] = useState("Initializing...");
    const [error, setError] = useState<string | null>(null);

    // Generation Modal State
    const [isGenerating, setIsGenerating] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [generationPhase, setGenerationPhase] = useState<"script" | "designing">("script");
    const [validationEnabled, setValidationEnabled] = useState(true);

    // Global context for background generation
    const { startGeneration } = useCourseGeneration();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user?.user_metadata?.location_preference) {
                setCountry(session.user.user_metadata.location_preference as "USA" | "UK");
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user?.user_metadata?.location_preference) {
                setCountry(session.user.user_metadata.location_preference as "USA" | "UK");
            }
        });

        return () => subscription.unsubscribe();
    }, []);


    // NEW: Load from ID if Present
    useEffect(() => {
        if (initialId && session) {
            // Wait for session to be ready to avoid issues, but loadFromHistory relies on component state mostly
            // However, we should probably check if history is loaded? 
            // Better: Just call loadFromHistory.
            loadFromHistory(initialId);
        }
    }, [initialId, session]);

    // PREVENT NAVIGATING AWAY WHEN IN PLANNING MODE
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (view === "planning") {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires returnValue to be set
                return '';
            }
        };

        if (view === "planning") {
            window.addEventListener("beforeunload", handleBeforeUnload);
        }

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [view]);



    // --- STEP 1: UPLOAD & PARSE ---
    const handleStartPlanning = async (file: File, d: number, s: string, accent: string, colorN: string) => {
        setIsLoading(true);
        setIsProcessing(true);
        setDuration(d);
        setStyle(s);
        setAccentColor(accent);
        setColorName(colorN);

        // 1. Upload & Extract Text
        const formData = new FormData();
        formData.append("file", file);
        try {
            // Note: We might want to authenticate this later, but currently it's just parsing text
            const res = await fetch("http://127.0.0.1:8000/upload-policy", { method: "POST", body: formData });
            const data = await res.json();
            if (data.text) {
                setPolicyText(data.text);
                await generatePlan(data.text, d);
            }
        } catch (e) {
            console.error("Upload error", e);
            setIsLoading(false);
        }
    };

    // --- STEP 2: GENERATE PLAN ---
    const generatePlan = async (text: string, d: number) => {
        try {
            const res = await fetch("http://127.0.0.1:8000/generate-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ policy_text: text, duration: d, country: country })
            });
            const data = await res.json();
            setTopics(data.topics || []);
            setTitle(data.title || "New Course"); // Capture Title
            setLearningObjective(data.learning_objective || ""); // Capture LO
            setIsProcessing(false);
            setView("planning");
        } catch (e) { console.error(e); setIsProcessing(false); }
        finally { setIsLoading(false); }
    };

    // --- STEP 3: START DESIGNING (Generate Script) ---
    const handleStartDesigning = async (finalTopics: Topic[]) => {
        if (!session) {
            console.error("No session found!");
            return;
        }

        setIsLoading(true);
        setIsGenerating(true);
        setGenerationPhase("script");
        setError(null);
        setStatusText("Generating script...");

        try {
            const res = await fetch("http://127.0.0.1:8000/generate-script", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    topics: finalTopics,
                    style: style,
                    duration: duration,
                    title: title,
                    policy_text: policyText, // Send Policy
                    learning_objective: learningObjective, // Send LO
                    country: country,
                    user_id: session.user.id, // Pass User ID
                    accent_color: accentColor, // Pass accent color hex
                    color_name: colorName // Pass color name for style prompt
                })
            });
            const data = await res.json();
            if (data.status === "started") {
                setCourseId(data.course_id);
                setValidationEnabled(data.validation_enabled ?? true);

                // Start tracking in global context
                startGeneration(data.course_id);

                // Show confirmation popup instead of blocking modal
                setIsGenerating(false);
                setIsLoading(false);
                setShowConfirmation(true);
            } else if (data.status === "error") {
                setError(data.message || "Failed to start course generation.");
            }
        } catch (e) {
            console.error(e);
            setError("Failed to connect to server. Please try again.");
        }
    };

    // Handle retry from modal
    const handleGenerationRetry = () => {
        setIsGenerating(false);
        setIsLoading(false);
        setError(null);
        setView("setup");
    };

    // POLLER
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    const pollStatus = (id: string) => {
        // Clear any existing poller first to avoid duplicates
        if (pollInterval.current) clearInterval(pollInterval.current);

        pollInterval.current = setInterval(async () => {
            try {
                const headers: any = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                // Add timestamp to prevent caching
                const res = await fetch(`http://127.0.0.1:8000/status/${id}?t=${Date.now()}`, {
                    headers,
                    cache: 'no-store'
                });

                if (res.status === 404) {
                    setError("Whoops looks like we've had an issue. Please try again.");
                    setStatusText("Generation Failed");
                    if (pollInterval.current) clearInterval(pollInterval.current);
                    return;
                }

                const data = await res.json();

                // No longer track video_url locally - we redirect on completion

                if (data.status === "failed" || data.status === "error") {
                    setError("Generation failed. Please try again.");
                    setStatusText("Generation Failed");
                    if (pollInterval.current) clearInterval(pollInterval.current);
                    return;
                }

                if (data.status && data.status !== "completed") {
                    setStatusText(data.status);
                }

                if (data.status === "completed") {
                    // Redirect to the canonical player page
                    if (pollInterval.current) clearInterval(pollInterval.current);
                    setIsLoading(false);
                    setIsGenerating(false);
                    router.push(`/dashboard/player?id=${id}`);
                }
            } catch (e) { console.error(e); }
        }, 1000);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, []);

    // Re-attach poller if we reload a historical item
    useEffect(() => {
        if (view === "designing" && courseId) pollStatus(courseId);
    }, []); // Only on mount if checking restoration, simplified for now.

    const loadFromHistory = (id: string) => {
        setCourseId(id);
        setView("designing");
        setStatusText("Loading Course Assets...");
        pollStatus(id);
    };





    if (!session) {
        return <LoadingScreen message="Loading course creator..." />;
    }

    return (
        <div className="relative w-full h-full min-h-[calc(100vh-4rem)]">
            {/* Processing Modal (Setup -> Planning transition) */}
            <ProcessingModal isOpen={isProcessing} />

            {/* Confirmation Dialog - shown after generation starts */}
            <Dialog open={showConfirmation}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                                <Rocket className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <DialogHeader className="space-y-1">
                            <DialogTitle className="text-2xl font-bold text-white">
                                We're On It! 🎬
                            </DialogTitle>
                            <DialogDescription className="text-teal-100 text-base">
                                Your video is being crafted in the background
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-slate-600 text-center">
                            You can check progress anytime from your <span className="font-semibold text-teal-700">Dashboard</span>.
                            We'll show a progress bar on your course while it's being created.
                        </p>
                        <Button
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                            onClick={() => {
                                setShowConfirmation(false);
                                router.push('/dashboard');
                            }}
                        >
                            Go to Dashboard
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Background Gradients */}
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none" aria-hidden="true">
                <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-teal-200 to-slate-200 opacity-60 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
            </div>




            <div className="flex flex-col items-center justify-center w-full max-w-6xl mx-auto pt-10 pb-20">
                {/* View Switching Logic */}
                {view === "setup" && (
                    <SetupForm onStart={handleStartPlanning} isLoading={isLoading} />
                )}

                {view === "planning" && (
                    <PlanningEditor
                        topics={topics}
                        duration={duration}
                        initialTitle={title}
                        initialLearningObjective={learningObjective}
                        onBack={() => {
                            if (window.confirm("You will lose your progress if you go back. Are you sure?")) {
                                setView("setup");
                            }
                        }}
                        onNext={(t, newTitle) => { setTitle(newTitle); handleStartDesigning(t); }}
                        isLoading={isLoading}
                    />
                )}

                {/* Designing view is handled by the modal - show empty placeholder */}
                {view === "designing" && !isGenerating && (
                    <div className="text-center text-slate-500 py-20">
                        Processing complete. Redirecting to player...
                    </div>
                )}
            </div>
        </div>
    );
}

// Wrap with Suspense for useSearchParams
export default function DashboardCreatePage() {
    return (
        <Suspense fallback={<LoadingScreen message="Loading course creator..." />}>
            <DashboardCreatePageContent />
        </Suspense>
    );
}
