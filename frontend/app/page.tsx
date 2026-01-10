"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import SetupForm from '../components/SetupForm';
import PlanningEditor from '../components/PlanningEditor';

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
    return <div className="text-white p-4">Waiting for slide data...</div>;
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
  const showImage = layout !== 'text_only'; // Text only hides main image for a clean look, or maybe shows it as bg? Let's stick to plan: Text Only = White BG centered text.

  return (
    <div className="flex flex-col gap-4 animate-in fade-in zoom-in duration-500">
      <div className="relative w-[800px] h-[450px] bg-slate-50 overflow-hidden border-4 border-gray-800 rounded-lg shadow-2xl group flex">

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
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <button
              onClick={startCourse}
              className="flex items-center gap-3 bg-teal-700 hover:bg-teal-600 text-white px-8 py-4 rounded-full font-bold text-xl transition-all hover:scale-105 shadow-lg"
            >
              Start Course
            </button>
          </div>
        )}

        <div className="absolute bottom-4 right-4 text-white bg-black/50 px-3 py-1 rounded text-sm font-mono z-20">
          Slide {index + 1} / {slides.length}
        </div>
      </div>

      <div className="flex justify-between items-center w-[800px]">
        <button onClick={onReset} className="text-gray-400 hover:text-white underline text-sm">
          ← Back to Library
        </button>

        {videoUrl ? (
          <button onClick={handleDownload} disabled={isDownloading} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded shadow transition">
            {isDownloading ? (
              <span className="flex items-center gap-2">Saving...</span>
            ) : (
              <>Download Video</>
            )}
          </button>
        ) : (
          <button onClick={onExport} disabled={isExporting} className={`flex items-center gap-2 px-4 py-2 rounded shadow transition text-white ${isExporting ? "bg-gray-600" : "bg-gray-700 hover:bg-gray-600"}`}>
            {isExporting ? "Compiling MP4..." : "Export as MP4"}
          </button>
        )}
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function Page() {
  const [view, setView] = useState<"setup" | "planning" | "designing" | "playing">("setup");
  const [isLoading, setIsLoading] = useState(false);

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
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/history");
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
    setIsLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: finalTopics,
          style: style,
          duration: duration,
          title: title,
          policy_text: policyText, // Send Policy
          learning_objective: learningObjective, // Send LO
          country: country
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
          fetchHistory();
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
    if (!courseId) return;
    setIsExporting(true);
    try {
      await fetch(`http://127.0.0.1:8000/export-video/${courseId}`, { method: "POST" });
    } catch (e) {
      console.error("Export failed", e);
      setIsExporting(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-slate-900 text-white font-sans">

      {/* SIDEBAR */}
      <div className="w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col gap-6 shrink-0 z-20">
        <div>
          <h2 className="text-xl font-bold text-teal-400 mb-4">Course Library</h2>
          <button
            onClick={() => setView("setup")}
            className="w-full bg-teal-700 hover:bg-teal-600 text-white font-bold py-3 rounded transition shadow-lg mb-6"
          >
            + New Course
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => loadFromHistory(item.id)}
              className={`w-full text-left p-3 rounded text-sm transition-all border border-slate-800
                 ${courseId === item.id ? "bg-teal-900/30 border-teal-500" : "bg-slate-900 hover:bg-slate-800"}`}
            >
              <div className="font-semibold text-slate-300 truncate">
                {item.name || (item.metadata?.topics && item.metadata.topics.length > 0 ? item.metadata.topics[0].title : "Untitled Course")}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {new Date(item.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] relative overflow-hidden">

        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-teal-900/20 blur-[120px] rounded-full mix-blend-screen"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-slate-800/30 blur-[120px] rounded-full mix-blend-screen"></div>
        </div>

        {/* COUNTRY TOGGLE */}
        <div className="absolute top-8 right-8 z-30 flex items-center bg-slate-900/80 backdrop-blur-md rounded-full p-1 border border-slate-700 shadow-xl">
          <button
            onClick={() => setCountry("USA")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold ${country === "USA" ? "bg-teal-700 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
          >
            <span className="text-lg">🇺🇸</span> USA
          </button>
          <button
            onClick={() => setCountry("UK")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all font-bold ${country === "UK" ? "bg-teal-700 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
          >
            <span className="text-lg">🇬🇧</span> UK
          </button>
        </div>

        <div className="z-10 w-full max-w-6xl flex justify-center">

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
            <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 border-4 border-teal-500/30 rounded-full animate-ping"></div>
                <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-teal-500/20 rounded-full blur-xl"></div>
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-light text-white tracking-wide">Designing Your Course</h2>
                <p className="text-teal-200 animate-pulse font-mono">{statusText}</p>
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
    </main>
  );
}