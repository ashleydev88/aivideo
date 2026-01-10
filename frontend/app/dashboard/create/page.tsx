"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle2, LayoutDashboard, LogOut, ChevronRight, PlayCircle } from 'lucide-react';
import SetupForm from '@/components/SetupForm';
import PlanningEditor from '@/components/PlanningEditor';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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

interface CourseHistoryItem {
    id: string;
    created_at: string;
    status: string;
    name?: string;
    metadata?: {
        topics: Topic[];
        style: string;
    }
}

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
function SeamlessPlayer({ slides = [], onReset, videoUrl, onExport, isExporting }:
    { slides: Slide[], onReset: () => void, videoUrl?: string, onExport: () => void, isExporting: boolean }) {

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

                {videoUrl ? (
                    <button onClick={handleDownload} disabled={isDownloading} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition font-medium">
                        {isDownloading ? (
                            <span className="flex items-center gap-2">Saving...</span>
                        ) : (
                            <>Download Video</>
                        )}
                    </button>
                ) : (
                    <button onClick={onExport} disabled={isExporting} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg shadow-sm transition font-medium text-white ${isExporting ? "bg-slate-400" : "bg-slate-700 hover:bg-slate-600"}`}>
                        {isExporting ? "Compiling MP4..." : "Export as MP4"}
                    </button>
                )}
            </div>
        </div>
    );
}

// --- MAIN PAGE ---
export default function DashboardCreatePage() {
    const [view, setView] = useState<"setup" | "planning" | "designing" | "playing">("setup");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const [session, setSession] = useState<any>(null);

    // Data State
    const [policyText, setPolicyText] = useState("");
    const [duration, setDuration] = useState(3);
    const [style, setStyle] = useState("Business Illustration");
    const [topics, setTopics] = useState<Topic[]>([]);
    const [title, setTitle] = useState("New Course"); // NEW: Title State
    const [learningObjective, setLearningObjective] = useState(""); // NEW: LO State
    const [courseId, setCourseId] = useState<string | null>(null);
    const [country, setCountry] = useState<"USA" | "UK">("USA");

    // Playback State
    const [slides, setSlides] = useState<Slide[]>([]);
    const [statusText, setStatusText] = useState("Initializing...");
    const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
    const [isExporting, setIsExporting] = useState(false);
    const [history, setHistory] = useState<CourseHistoryItem[]>([]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchHistory(session.access_token);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                fetchHistory(session.access_token);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchHistory = async (token: string) => {
        try {
            const res = await fetch("http://127.0.0.1:8000/history", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (Array.isArray(data)) setHistory(data);
        } catch (e) {
            console.error(e);
            setHistory([]);
        }
    };

    // --- STEP 1: UPLOAD & PARSE ---
    const handleStartPlanning = async (file: File, d: number, s: string) => {
        setIsLoading(true);
        setDuration(d);
        setStyle(s);

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
            setView("planning");
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    // --- STEP 3: START DESIGNING (Generate Script) ---
    const handleStartDesigning = async (finalTopics: Topic[]) => {
        if (!session) {
            console.error("No session found!");
            return;
        }

        setIsLoading(true);
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
                    user_id: session.user.id // Pass User ID
                })
            });
            const data = await res.json();
            if (data.status === "started") {
                setCourseId(data.course_id);
                setView("designing");
                pollStatus(data.course_id);
            }
        } catch (e) { console.error(e); }
    };

    // POLLER
    const pollStatus = (id: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8000/status/${id}`);
                const data = await res.json();

                if (data.video_url) {
                    setVideoUrl(data.video_url);
                    setIsExporting(false);
                }

                if (data.status && data.status !== "completed") {
                    setStatusText(data.status);
                }

                if (data.status === "completed") {
                    setSlides(data.data);
                    setIsLoading(false);
                    setView("playing");
                    if (session) fetchHistory(session.access_token);
                    clearInterval(interval);
                }
            } catch (e) { console.error(e); }
        }, 1000);
    };

    // Re-attach poller if we reload a historical item
    useEffect(() => {
        if (view === "designing" && courseId) pollStatus(courseId);
    }, []); // Only on mount if checking restoration, simplified for now.

    const loadFromHistory = (id: string) => {
        setCourseId(id);
        setVideoUrl(undefined);
        setIsExporting(false);
        setView("designing");
        setStatusText("Loading Course Assets...");
        pollStatus(id);
    };

    const handleExport = async () => {
        if (!courseId || !session) return;
        setIsExporting(true);
        try {
            await fetch(`http://127.0.0.1:8000/export-video/${courseId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });
        } catch (e) {
            console.error("Export failed", e);
            setIsExporting(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    if (!session) {
        // Handled by middleware mostly, but good for flicker protection
        return <div className="min-h-screen bg-white flex items-center justify-center text-teal-700">Loading Auth...</div>;
    }

    return (
        <main className="flex min-h-screen bg-white font-sans text-slate-900">

            {/* SIDEBAR */}
            <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 z-20">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 rounded bg-teal-700 flex items-center justify-center text-white font-bold">C</div>
                        <span className="text-xl font-bold text-slate-900 tracking-tight">ComplianceVideo</span>
                    </div>

                    <button
                        onClick={() => setView("setup")}
                        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 px-4 rounded-lg transition shadow-sm hover:shadow flex items-center justify-center gap-2 mb-8 group"
                    >
                        <span>+</span> Create New
                    </button>

                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Library</div>

                    <div className="space-y-1">
                        {history.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => loadFromHistory(item.id)}
                                className={`w-full text-left p-3 rounded-lg text-sm transition-all flex items-center justify-between group
                 ${courseId === item.id
                                        ? "bg-white text-teal-700 shadow-sm ring-1 ring-slate-200"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                            >
                                <span className="truncate font-medium">
                                    {item.name || (item.metadata?.topics && item.metadata.topics.length > 0 ? item.metadata.topics[0].title : "Untitled Course")}
                                </span>
                                {courseId === item.id && <ChevronRight size={14} />}
                            </button>
                        ))}
                        {history.length === 0 && (
                            <div className="text-sm text-slate-400 italic px-3 py-2">No courses yet.</div>
                        )}
                    </div>
                </div>

                <div className="mt-auto p-4 border-t border-slate-200">
                    <button onClick={handleSignOut} className="w-full text-slate-500 hover:text-red-600 text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 flex flex-col relative overflow-hidden">

                {/* Background Gradients (Matches Home Page) */}
                <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none" aria-hidden="true">
                    <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-teal-200 to-slate-200 opacity-60 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
                </div>
                <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)] pointer-events-none" aria-hidden="true">
                    <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-teal-200 to-slate-200 opacity-60 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
                </div>

                {/* HEADER / TOP BAR */}
                <div className="absolute top-0 right-0 p-8 z-30 flex justify-end">
                    {/* COUNTRY TOGGLE */}
                    <div className="flex items-center bg-white/80 backdrop-blur-md rounded-full p-1 border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setCountry("USA")}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-sm font-bold ${country === "USA" ? "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200" : "text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            <span className="text-base">🇺🇸</span> USA
                        </button>
                        <button
                            onClick={() => setCountry("UK")}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-sm font-bold ${country === "UK" ? "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200" : "text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            <span className="text-base">🇬🇧</span> UK
                        </button>
                    </div>
                </div>


                <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto w-full">
                    <div className="w-full max-w-6xl flex justify-center pb-20 pt-10">

                        {view === "setup" && (
                            <SetupForm onStart={handleStartPlanning} isLoading={isLoading} />
                        )}

                        {view === "planning" && (
                            <PlanningEditor
                                topics={topics}
                                duration={duration}
                                initialTitle={title}
                                initialLearningObjective={learningObjective}
                                onBack={() => setView("setup")}
                                onNext={(t, newTitle) => { setTitle(newTitle); handleStartDesigning(t); }}
                                isLoading={isLoading}
                            />
                        )}

                        {view === "designing" && (
                            <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700 py-20">
                                <div className="relative w-32 h-32">
                                    <div className="absolute inset-0 border-4 border-teal-200 rounded-full animate-ping"></div>
                                    <div className="absolute inset-0 border-4 border-teal-600 rounded-full border-t-transparent animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-16 bg-teal-50 rounded-full blur-xl"></div>
                                    </div>
                                </div>
                                <div className="text-center space-y-3">
                                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Designing Your Course</h2>
                                    <p className="text-slate-500 animate-pulse font-medium">{statusText}</p>
                                </div>
                            </div>
                        )}

                        {view === "playing" && (
                            <SeamlessPlayer
                                slides={slides}
                                onReset={() => setView("setup")}
                                videoUrl={videoUrl}
                                onExport={handleExport}
                                isExporting={isExporting}
                            />
                        )}

                    </div>
                </div>
            </div>
        </main>
    );
}
