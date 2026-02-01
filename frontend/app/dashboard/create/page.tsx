"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import CourseWizard from '@/components/CourseWizard';
import PlanningEditor from '@/components/PlanningEditor';

import { createClient } from '@/lib/supabase/client';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCourseGeneration } from '@/lib/CourseGenerationContext';
import { Loader2 } from "lucide-react";

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
function SeamlessPlayer({ slides = [], onReset, videoUrl, logoInfo }:
    { slides: Slide[], onReset: () => void, videoUrl?: string, logoInfo?: { url: string, crop: any } }) {

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

                {/* TEXT SIDE (Or Full Centre) */}
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

                {/* Logo Overlay on First and Last Slides */}
                {(index === 0 || index === slides.length - 1) && logoInfo?.url && (
                    <div className="absolute bottom-4 left-4 z-30 w-16 h-16 bg-white/80 backdrop-blur rounded-lg border border-white/50 shadow-sm overflow-hidden p-1 flex items-center justify-center">
                        <img
                            src={logoInfo.url.startsWith('http') ? logoInfo.url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/course-assets/${logoInfo.url}`}
                            alt="Logo"
                            className="max-w-full max-h-full object-contain"
                            style={logoInfo.crop ? {
                                transform: `scale(${logoInfo.crop.zoom || 1})`,
                                transformOrigin: 'center'
                            } : {}}
                        />
                    </div>
                )}
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
    const [title, setTitle] = useState(""); // Default to empty, will be set by SetupForm
    const [learningObjective, setLearningObjective] = useState("");
    const [courseId, setCourseId] = useState<string | null>(null);
    const [country, setCountry] = useState<"USA" | "UK">("UK");
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoCrop, setLogoCrop] = useState<any>(null);
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
    const { activeGeneration, startGeneration } = useCourseGeneration();

    // Sync local status with global context and handle redirects
    useEffect(() => {
        if (activeGeneration?.courseId === courseId) {
            if (activeGeneration.status === "completed") {
                setIsLoading(false);
                setIsGenerating(false);
                router.push(`/dashboard/player?id=${courseId}`);
            } else if (activeGeneration.status === "error" || activeGeneration.status === "failed") {
                setError(activeGeneration.error || "Generation failed. Please try again.");
                setStatusText("Generation Failed");
            } else if (activeGeneration.status) {
                setStatusText(activeGeneration.status);
            }
        }
    }, [activeGeneration, courseId, router]);

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



    // --- STEP 1: WIZARD COMPLETION ---
    const handleWizardComplete = async (wizardState: any) => {
        setIsLoading(true);
        setIsProcessing(true);

        // Fetch user logo info
        const { data: { user } } = await supabase.auth.getUser();

        // Persist visual preference
        if (user && wizardState.style) {
            await supabase.auth.updateUser({
                data: { visual_preference: wizardState.style }
            });
        }

        try {
            const res = await fetch("http://127.0.0.1:8000/start-intake", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    course_purpose: wizardState.purpose,
                    target_audience: wizardState.audience,
                    has_source_documents: wizardState.hasDocuments,
                    duration: wizardState.duration,
                    title: wizardState.title,
                    style: wizardState.style,
                    accent_color: wizardState.accentColor,
                    color_name: wizardState.colorName,
                    country: country,
                    logo_url: user?.user_metadata?.logo_url,
                    logo_crop: user?.user_metadata?.logo_crop,
                    conversation_history: [] // We could pass the chat history here if we wanted to store it
                })
            });

            const data = await res.json();

            if (data.status === "started") {
                // If text was extracted locally in wizard, we might need to send it separately 
                // OR we rely on the backend to have it if we used the upload endpoint.
                // If the wizard uploaded files, the backend has the text? 
                // The wizard's FileUploader component creates a combined text string.
                // We should update the course with this text if it exists.

                if (wizardState.documentText) {
                    await fetch(`http://127.0.0.1:8000/course/${data.course_id}/source-documents`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({
                            source_document_text: wizardState.documentText
                        })
                    });
                }

                router.push('/dashboard');
            } else {
                console.error("Failed to start intake");
                alert("Failed to start generation");
                setIsLoading(false);
                setIsProcessing(false);
            }
        } catch (e) {
            console.error("Intake error", e);
            setIsLoading(false);
            setIsProcessing(false);
        }
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
                    accent_color: accentColor, // Pass accent colour hex
                    color_name: colorName, // Pass color name for style prompt
                    logo_url: logoUrl,
                    logo_crop: logoCrop
                })
            });
            const data = await res.json();
            if (data.status === "started") {
                setCourseId(data.course_id);
                setValidationEnabled(data.validation_enabled ?? true);

                // Start tracking in global context
                // Start tracking in global context
                startGeneration(data.course_id);

                // Redirect to dashboard immediately
                setIsGenerating(false);
                setIsLoading(false);
                router.push('/dashboard');
            } else if (data.status === "error") {
                setError(data.message || "Failed to start course generation.");
            }
        } catch (e) {
            console.error("Start Designing Error:", e);
            setError("Failed to connect to server. Please try again.");
        } finally {
            // Ensure we don't get stuck in loading state if something failed inside the try
            // If success, we already set these to false, but setting them again is harmless (React batching)
            // However, we MUST ensure showConfirmation stays TRUE if we succeeded.
            // The check below ensures we don't accidentally hide the modal if we succeeded? 
            // Actually, we set them to false in the success block.
            // But if we error, we need them false.
            setIsLoading(false);
            // We keep isGenerating true if we are successful? No, we set it to false to stop the button spinner.
            // But we check `isGenerating` in other places? 
            // In the button: `isLoading || isGenerating`
            // So setting both false is correct for "done with RPC call".
            // If the user didn't see the modal, it means we didn't hit the success block.
            setIsGenerating(false);
        }
    };

    // Handle retry from modal
    const handleGenerationRetry = () => {
        setIsGenerating(false);
        setIsLoading(false);
        setError(null);
        setView("setup");
    };



    const loadFromHistory = (id: string) => {
        setCourseId(id);
        setView("designing");
        setStatusText("Loading Course Assets...");
        // Global context will handle polling automatically when courseId is set
        startGeneration(id);
    };





    if (!session) {
        return <LoadingScreen message="Loading course creator..." />;
    }

    return (
        <div className="relative w-full h-full min-h-[calc(100vh-4rem)]">
            {/* Processing Modal (Setup -> Planning transition) */}


            {/* Background Gradients */}
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none" aria-hidden="true">
                <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-teal-200 to-slate-200 opacity-60 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
            </div>




            <div className="flex flex-col items-center justify-center w-full max-w-6xl mx-auto pt-10 pb-20">
                {view === "setup" && (
                    <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="text-center mb-10 space-y-4">
                            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                                Create Your Course
                            </h1>
                            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                                Let's build a high-impact video course together. Just answer a few questions to get started.
                            </p>
                        </div>
                        <CourseWizard onComplete={handleWizardComplete} isLoading={isLoading} />
                    </div>
                )}



                {/* Designing view is handled by the modal - show empty placeholder */}
                {view === "designing" && !isGenerating && (
                    <div className="flex flex-col items-center gap-8 py-20">
                        <SeamlessPlayer
                            slides={activeGeneration?.slideData || []}
                            onReset={() => setView("setup")}
                            videoUrl={activeGeneration?.videoUrl || undefined}
                            logoInfo={logoUrl ? { url: logoUrl, crop: logoCrop } : undefined}
                        />
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
