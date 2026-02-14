"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    ChevronLeft,
    ChevronRight,
    Save,
    PlayCircle,
    Loader2,
    FileText,
    PanelRightOpen,
    PanelRightClose,
    ListChecks,
    Plus,
    Trash2,
    LayoutGrid,
    PencilLine,
    ArrowUp,
    ArrowDown,
    GripVertical,
    ZoomIn,
    ZoomOut
} from "lucide-react";
import VisualPreview from "./VisualPreview";
import { createClient } from "@/lib/supabase/client";

interface Slide {
    id?: number; // Visual Director adds 1-based IDs
    slide_number: number;
    text: string;
    visual_text: string;
    layout: "split" | "text_only" | "image_only";
    visual_type: "image" | "hybrid" | "chart" | "kinetic_text" | "title_card" | "comparison_split" | "key_stat_breakout" | "document_anchor" | "contextual_overlay" | "contextual-overlay";
    prompt: string;
    duration: number;
    image?: string;
    chart_data?: unknown;
    timestamps?: unknown;
    background_color?: string;
    text_color?: string;
    accent_color?: string;
    layout_data?: Record<string, unknown>;
    timing_links_manual?: TimingLink[];
    timing_links_auto?: TimingLink[];
    timing_resolved?: TimingResolvedEntry[];
    timing_meta?: {
        version?: number;
        status?: string;
        stale?: boolean;
        errors?: string[];
        narration_token_count?: number;
        target_count?: number;
        manual_link_count?: number;
        auto_link_count?: number;
        active_link_count?: number;
    };
    is_assessment?: boolean;
    assessment_data?: {
        question: string;
        options: string[];
        correct_index: number;
        explanation: string;
        points: number;
    };
}

interface TimingLink {
    id?: string;
    source?: {
        type?: "word" | "paragraph" | "heading" | "node" | "edge";
        id?: string;
    };
    target?: {
        token_index?: number;
    };
    animation?: {
        preset?: string;
        duration_ms?: number;
    };
    origin?: string;
}

interface TimingResolvedEntry {
    id: string;
    origin?: string;
    source_type: "word" | "paragraph" | "heading" | "node" | "edge";
    source_id: string;
    source_text?: string;
    token_index?: number | null;
    token_word?: string;
    start_ms: number;
    end_ms?: number;
    animation?: {
        preset?: string;
        duration_ms?: number;
    };
}

type AssessmentData = NonNullable<Slide["assessment_data"]>;
type ChartArchetype =
    | "process"
    | "cycle"
    | "hierarchy"
    | "comparison"
    | "statistic"
    | "grid"
    | "timeline"
    | "funnel"
    | "pyramid"
    | "mindmap"
    | "code"
    | "math"
    | "architecture"
    | "matrix"
    | "metaphor"
    | "anatomy"
    | "document-anchor"
    | "contextual-overlay";

interface SlideEditorProps {
    courseId: string;
    initialSlides: Slide[];
    onFinalize: () => void;
}

const commonTextAreaClass = "min-h-[120px] w-full p-3 rounded-md border border-slate-200 text-base text-slate-800 leading-relaxed shadow-sm focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-transparent transition-all resize-y";
const IMAGE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080' viewBox='0 0 1920 1080'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23111827'/%3E%3Cstop offset='100%25' stop-color='%23334155'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1920' height='1080' fill='url(%23g)'/%3E%3Ccircle cx='620' cy='380' r='110' fill='%2338bdf8' fill-opacity='0.25'/%3E%3Ccircle cx='1320' cy='720' r='180' fill='%2322d3ee' fill-opacity='0.15'/%3E%3Crect x='510' y='310' width='900' height='460' rx='28' fill='%230f172a' fill-opacity='0.5' stroke='%2394a3b8' stroke-opacity='0.35' stroke-width='4'/%3E%3Ctext x='960' y='520' text-anchor='middle' fill='white' font-family='Arial,sans-serif' font-size='64' font-weight='700'%3EImage Placeholder%3C/text%3E%3Ctext x='960' y='590' text-anchor='middle' fill='%23cbd5e1' font-family='Arial,sans-serif' font-size='32'%3EAdd prompt or regenerate visual later%3C/text%3E%3C/svg%3E";
const DEFAULT_ASSESSMENT_QUESTION = "Knowledge Check: insert your question here";
const DEFAULT_ASSESSMENT_OPTIONS = ["Option A", "Option B", "Option C"];
const DEFAULT_ASSESSMENT_EXPLANATION = "Replace this with the rationale for the correct answer.";

const createDefaultAssessmentData = (): AssessmentData => ({
    question: DEFAULT_ASSESSMENT_QUESTION,
    options: [...DEFAULT_ASSESSMENT_OPTIONS],
    correct_index: 0,
    explanation: DEFAULT_ASSESSMENT_EXPLANATION,
    points: 1
});

const buildAssessmentVisualText = (assessment: AssessmentData): string => {
    const optionsHtml = assessment.options
        .map((option, idx) => `<p>${String.fromCharCode(65 + idx)}. ${option || "Option"}</p>`)
        .join("");

    return `<h2>${assessment.question || "Quick Check"}</h2>${optionsHtml}`;
};

// Reusable Collapsible Section Component
const SidebarSection = ({
    title,
    icon: Icon,
    iconColor,
    isOpen,
    onToggle,
    children,
    rightElement
}: {
    title: string,
    icon: React.ComponentType<{ className?: string }>,
    iconColor: string,
    isOpen: boolean,
    onToggle: () => void,
    children: React.ReactNode,
    rightElement?: React.ReactNode
}) => (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200">
        <div
            className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-slate-50/50 hover:bg-slate-50 transition-colors ${isOpen ? 'border-b border-slate-100' : ''}`}
            onClick={onToggle}
        >
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-md bg-white border shadow-sm ${isOpen ? '' : 'opacity-70'}`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
                <span className="font-semibold text-sm text-slate-700">{title}</span>
            </div>
            <div className="flex items-center gap-3">
                {rightElement}
                {isOpen ? <ChevronLeft className="h-4 w-4 text-slate-400 rotate-[-90deg] transition-transform" /> : <ChevronLeft className="h-4 w-4 text-slate-400 rotate-0 transition-transform" />}
            </div>
        </div>

        <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
            <div className="p-4 space-y-3">
                {children}
            </div>
        </div>
    </div>
);

export default function SlideEditor({ courseId, initialSlides, onFinalize }: SlideEditorProps) {

    const [slides, setSlides] = useState<Slide[]>(initialSlides);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [userBrandColor, setUserBrandColor] = useState<string | null>(null);
    const narrationRef = useRef<HTMLTextAreaElement>(null);

    const [isRenderQueued, setIsRenderQueued] = useState(false);
    const [renderStatusLabel, setRenderStatusLabel] = useState<string>('');

    useEffect(() => {
        let mounted = true;
        const checkStatus = async () => {
            try {
                const supabase = createClient();
                const { data } = await supabase.from('courses').select('status, progress').eq('id', courseId).single();
                if (!mounted || !data) return;
                const st = data.status as string;
                if (['queued','processing_render','rendering'].includes(st)) {
                    setIsRenderQueued(true);
                    const pct = typeof data.progress === 'number' ? Math.round(data.progress) : null;
                    setRenderStatusLabel(st === 'queued' ? 'Queued' : `Rendering${pct!==null ? ' '+pct+'%' : ''}`);
                } else {
                    setIsRenderQueued(false);
                    setRenderStatusLabel('');
                }
            } catch {}
        };
        checkStatus();
        const t = setInterval(checkStatus, 15000);
        return () => { mounted = false; clearInterval(t); };
    }, [courseId]);

    useEffect(() => {
        let mounted = true;
        const loadUserBrandColor = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!mounted || !user) return;
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("brand_colour")
                    .eq("id", user.id)
                    .single();
                if (mounted) {
                    setUserBrandColor(profile?.brand_colour || null);
                }
            } catch {
                if (mounted) setUserBrandColor(null);
            }
        };

        loadUserBrandColor();
        return () => { mounted = false; };
    }, []);


    const currentSlide = slides[currentSlideIndex];

    const buildDefaultChartData = (archetype: ChartArchetype = "process") => ({
        id: `chart-${Date.now()}`,
        archetype,
        nodes: [
            {
                id: "node-1",
                type: "motion-card",
                data: {
                    label: "Point 1",
                    description: "Edit this chart node",
                    variant: "primary"
                }
            },
            {
                id: "node-2",
                type: "motion-card",
                data: {
                    label: "Point 2",
                    description: "Edit this chart node",
                    variant: "neutral"
                }
            }
        ],
        edges: [
            {
                id: "edge-1",
                source: "node-1",
                target: "node-2"
            }
        ]
    });

    const renumberSlides = (inputSlides: Slide[]): Slide[] => {
        return inputSlides.map((slide, idx) => ({
            ...slide,
            slide_number: idx + 1
        }));
    };

    const buildAssessmentData = (inputSlides: Slide[]) => {
        return inputSlides
            .map((slide, idx) => ({
                slide_number: idx + 1,
                assessment_data: slide.assessment_data
            }))
            .filter((entry) => entry.assessment_data);
    };

    const buildNarrationTokens = (text: string): Array<{ index: number; word: string }> => {
        return text
            .split(/\s+/)
            .map((word) => word.trim())
            .filter(Boolean)
            .map((word, index) => ({ index, word }));
    };

    // Auto-size narration textarea
    useEffect(() => {
        if (narrationRef.current) {
            // Reset height to calculate scrollHeight correctly
            narrationRef.current.style.height = 'auto';
            // Set height to scrollHeight
            narrationRef.current.style.height = `${narrationRef.current.scrollHeight}px`;
        }
    }, [currentSlide.text, currentSlideIndex]);

    // Auto-save timer
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSave(true);
        }, 30000); // Auto-save every 30s
        return () => clearTimeout(timer);
    }, [slides]);

    const handleUpdateSlide = (field: keyof Slide, value: unknown) => {
        const newSlides = [...slides];
        newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], [field]: value };
        setSlides(newSlides);
    };

    const handleSave = useCallback(async (silent = false, slidesToSave?: Slide[]) => {
        setIsSaving(true);
        try {
            const supabase = createClient();
            const normalizedSlides = renumberSlides(slidesToSave ?? slides);
            await supabase
                .from("courses")
                .update({
                    slide_data: normalizedSlides,
                    assessment_data: buildAssessmentData(normalizedSlides)
                })
                .eq("id", courseId);

            if (!silent) {
                // display toast?
                console.log("Saved");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    }, [courseId, slides]);

    const handleNext = () => {
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentSlideIndex > 0) {
            setCurrentSlideIndex(prev => prev - 1);
        }
    };

    const handleGenerateVideo = async () => {
        if (isRenderQueued) {
            // Already queued or rendering; prevent duplicate
            alert(renderStatusLabel ? `Render already in progress: ${renderStatusLabel}` : "Render already in progress");
            return;
        }
        setIsFinalizing(true);
        try {
            // Force save first
            await handleSave(true);

            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const normalizedSlides = renumberSlides(slides);
            const res = await fetch(`${API_BASE_URL}/api/course/finalize-course?course_id=${courseId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ slide_data: normalizedSlides })
            });

            if (res.ok) {
                onFinalize();
            } else {
                alert("Failed to start finalized build.");
            }
        } catch (e) {
            console.error(e);
            alert("Error finalizing course.");
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleAddAssessmentStep = () => {
        const assessmentBackgroundColor = userBrandColor || "#ffffff";
        const assessmentTextColor = userBrandColor ? "#ffffff" : "#0f172a";
        const defaultAssessment = createDefaultAssessmentData();
        const newSlide: Slide = {
            slide_number: currentSlideIndex + 2,
            text: "Quick check. Review the options and choose the best answer.",
            visual_text: buildAssessmentVisualText(defaultAssessment),
            layout: "text_only",
            visual_type: "title_card",
            prompt: "",
            duration: 20000,
            background_color: assessmentBackgroundColor,
            text_color: assessmentTextColor,
            is_assessment: true,
            assessment_data: defaultAssessment
        };

        const updatedSlides = renumberSlides([
            ...slides.slice(0, currentSlideIndex + 1),
            newSlide,
            ...slides.slice(currentSlideIndex + 1)
        ]);

        setSlides(updatedSlides);
        setCurrentSlideIndex(currentSlideIndex + 1);
        setIsSidebarOpen(true);
        setOpenSections((prev) => ({ ...prev, narration: false, assessment: true }));
    };

    const handleInsertSlide = () => {
        const seedText = (currentSlide?.text || currentSlide?.visual_text || "").toString().replace(/<[^>]*>/g, "").trim();
        const newSlide: Slide = {
            slide_number: currentSlideIndex + 2,
            text: seedText ? `Build on this point: ${seedText.slice(0, 80)}.` : "Add narration for this slide.",
            visual_text: "<h2>New Slide</h2><p>Edit this content.</p>",
            layout: "split",
            visual_type: "image",
            prompt: "A clean, professional business scene that supports the narration.",
            duration: 7000,
            image: IMAGE_PLACEHOLDER,
            background_color: "#000000",
            text_color: "#ffffff",
            is_assessment: false
        };

        const updatedSlides = renumberSlides([
            ...slides.slice(0, currentSlideIndex + 1),
            newSlide,
            ...slides.slice(currentSlideIndex + 1)
        ]);

        setSlides(updatedSlides);
        setCurrentSlideIndex(currentSlideIndex + 1);
        setIsSidebarOpen(true);
    };

    const handleVisualTypeChange = (value: string) => {
        const nextType = value as Slide["visual_type"];
        const nextSlides = [...slides];
        const target = { ...nextSlides[currentSlideIndex], visual_type: nextType, is_assessment: false };

        if (nextType === "chart" && !target.chart_data) {
            target.chart_data = buildDefaultChartData("process");
            if (!target.visual_text) target.visual_text = "<h2>Chart Slide</h2>";
        }

        if (["image", "hybrid", "contextual_overlay", "contextual-overlay"].includes(nextType) && !target.image) {
            target.image = IMAGE_PLACEHOLDER;
        }

        if (["comparison_split", "key_stat_breakout", "document_anchor", "contextual_overlay", "contextual-overlay"].includes(nextType)) {
            target.layout_data = target.layout_data || {};
            target.chart_data = undefined;
        }

        nextSlides[currentSlideIndex] = target;
        setSlides(nextSlides);
    };

    const handleChartArchetypeChange = (archetype: ChartArchetype) => {
        const nextSlides = [...slides];
        const target = { ...nextSlides[currentSlideIndex] };
        const base = target.chart_data && typeof target.chart_data === "object"
            ? { ...(target.chart_data as Record<string, unknown>) }
            : buildDefaultChartData(archetype);

        target.chart_data = {
            ...base,
            archetype
        };
        target.visual_type = "chart";
        target.is_assessment = false;
        nextSlides[currentSlideIndex] = target;
        setSlides(nextSlides);
    };

    const handleDeleteCurrentSlide = () => {
        if (slides.length <= 1) {
            alert("You need at least one slide in the course.");
            return;
        }

        const shouldDelete = window.confirm(`Delete slide warning: Delete slide ${currentSlideIndex + 1}? This action cannot be undone.`);
        if (!shouldDelete) return;

        const currentSlideNumber = slides[currentSlideIndex]?.slide_number;
        const updatedSlides = renumberSlides(
            typeof currentSlideNumber === "number"
                ? slides.filter((slide) => slide.slide_number !== currentSlideNumber)
                : slides.filter((_, idx) => idx !== currentSlideIndex)
        );
        const nextIndex = Math.min(currentSlideIndex, updatedSlides.length - 1);
        setSlides(updatedSlides);
        setCurrentSlideIndex(nextIndex);
        void handleSave(true, updatedSlides);
    };

    // Helper to get defaults matching VisualPreview
    const getSlideDefaults = (s: Slide) => {
        const isThankYou = s.text?.toLowerCase().includes("thank you");

        if (s.visual_type === 'title_card') {
            return {
                bg: isThankYou ? '#1e293b' : '#0d9488', // slate-800 or teal-600
                text: '#ffffff'
            };
        }
        if (s.visual_type === 'kinetic_text') {
            return { bg: '#0f172a', text: '#ffffff' };
        }
        if (s.visual_type === 'hybrid') {
            return { bg: '#0f172a', text: '#ffffff' };
        }
        if (s.visual_type === 'chart') {
            return { bg: '#f8fafc', text: '#1e293b' };
        }
        // Default Image/Other
        return { bg: '#000000', text: '#ffffff' };
    };

    // Collapsible Section State
    const [openSections, setOpenSections] = useState({
        slideType: true,
        narration: true,
        assessment: true,
        onScreenText: false,
        styling: false
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"edit" | "overview">("edit");
    const [dragSlideIndex, setDragSlideIndex] = useState<number | null>(null);
    const [overviewDensity, setOverviewDensity] = useState<"default" | "compact">("default");
    const slidesLengthRef = useRef(slides.length);

    const toggleSection = (key: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const getAssessmentData = (slide: Slide): AssessmentData => {
        return slide.assessment_data || createDefaultAssessmentData();
    };

    const updateAssessment = (updates: Partial<AssessmentData>) => {
        const currentAssessment = getAssessmentData(currentSlide);
        const nextAssessment = { ...currentAssessment, ...updates };

        // Keep correct answer index valid if options changed
        if (nextAssessment.correct_index > nextAssessment.options.length - 1) {
            nextAssessment.correct_index = Math.max(0, nextAssessment.options.length - 1);
        }

        const newSlides = [...slides];
        newSlides[currentSlideIndex] = {
            ...newSlides[currentSlideIndex],
            is_assessment: true,
            assessment_data: nextAssessment,
            visual_text: buildAssessmentVisualText(nextAssessment),
            text: nextAssessment.explanation || newSlides[currentSlideIndex].text
        };
        setSlides(newSlides);
    };

    const handleAssessmentOptionChange = (index: number, value: string) => {
        const assessment = getAssessmentData(currentSlide);
        const nextOptions = [...assessment.options];
        nextOptions[index] = value;
        updateAssessment({ options: nextOptions });
    };

    const handleAddAssessmentOption = () => {
        const assessment = getAssessmentData(currentSlide);
        const nextLabel = `Option ${String.fromCharCode(65 + assessment.options.length)}`;
        updateAssessment({ options: [...assessment.options, nextLabel] });
    };

    const handleRemoveAssessmentOption = (index: number) => {
        const assessment = getAssessmentData(currentSlide);
        if (assessment.options.length <= 2) return;
        const nextOptions = assessment.options.filter((_, i) => i !== index);
        let nextCorrect = assessment.correct_index;
        if (index === assessment.correct_index) nextCorrect = 0;
        if (index < assessment.correct_index) nextCorrect = assessment.correct_index - 1;
        updateAssessment({ options: nextOptions, correct_index: nextCorrect });
    };

    const currentAssessment = currentSlide?.is_assessment ? getAssessmentData(currentSlide) : null;
    const narrationTokens = buildNarrationTokens(currentSlide?.text || "");
    const manualTimingLinks = Array.isArray(currentSlide?.timing_links_manual) ? currentSlide.timing_links_manual : [];
    const editorTimingLinks = manualTimingLinks
        .map((link) => {
            const sourceId = link.source?.id;
            const tokenIndex = link.target?.token_index;
            if (!sourceId || typeof tokenIndex !== "number") return null;
            return { sourceId, tokenIndex };
        })
        .filter((entry): entry is { sourceId: string; tokenIndex: number } => !!entry);

    const upsertManualTimingLink = (payload: { sourceId: string; sourceType: "word" | "paragraph" | "heading" | "node" | "edge"; sourceText: string; tokenIndex: number }) => {
        const nextSlides = [...slides];
        const existing = Array.isArray(nextSlides[currentSlideIndex].timing_links_manual)
            ? [...(nextSlides[currentSlideIndex].timing_links_manual as TimingLink[])]
            : [];
        const filtered = existing.filter((link) => link.source?.id !== payload.sourceId);
        filtered.push({
            id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: { type: payload.sourceType, id: payload.sourceId },
            target: { token_index: payload.tokenIndex },
            animation: { preset: "appear", duration_ms: 450 },
            origin: "manual"
        });
        nextSlides[currentSlideIndex] = {
            ...nextSlides[currentSlideIndex],
            timing_links_manual: filtered
        };
        setSlides(nextSlides);
    };

    const removeManualTimingLinkBySource = (sourceId: string) => {
        const nextSlides = [...slides];
        const existing = Array.isArray(nextSlides[currentSlideIndex].timing_links_manual)
            ? [...(nextSlides[currentSlideIndex].timing_links_manual as TimingLink[])]
            : [];
        nextSlides[currentSlideIndex] = {
            ...nextSlides[currentSlideIndex],
            timing_links_manual: existing.filter((link) => link.source?.id !== sourceId)
        };
        setSlides(nextSlides);
    };

    const moveSlide = useCallback((fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= slides.length || toIndex >= slides.length) return;

        const reorderedSlides = [...slides];
        const [movedSlide] = reorderedSlides.splice(fromIndex, 1);
        reorderedSlides.splice(toIndex, 0, movedSlide);
        const normalizedSlides = renumberSlides(reorderedSlides);

        setSlides(normalizedSlides);
        setCurrentSlideIndex((prev) => {
            if (prev === fromIndex) return toIndex;
            if (fromIndex < prev && prev <= toIndex) return prev - 1;
            if (toIndex <= prev && prev < fromIndex) return prev + 1;
            return prev;
        });
        void handleSave(true, normalizedSlides);
    }, [slides, handleSave]);

    const handleDropReorder = (targetIndex: number, e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const fromData = Number.parseInt(e.dataTransfer.getData("text/plain"), 10);
        const sourceIndex = dragSlideIndex ?? fromData;
        setDragSlideIndex(null);
        if (!Number.isInteger(sourceIndex)) return;
        moveSlide(sourceIndex, targetIndex);
    };

    useEffect(() => {
        slidesLengthRef.current = slides.length;
    }, [slides.length]);

    useEffect(() => {
        if (viewMode !== "overview") return;

        const onOverviewKeyDown = (event: KeyboardEvent) => {
            const isMod = event.metaKey || event.ctrlKey;
            if (isMod && event.shiftKey) {
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveSlide(currentSlideIndex, currentSlideIndex - 1);
                } else if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveSlide(currentSlideIndex, currentSlideIndex + 1);
                }
                return;
            }

            if (event.altKey || isMod || event.shiftKey) return;

            if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
            } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                setCurrentSlideIndex((prev) => Math.min(slidesLengthRef.current - 1, prev + 1));
            }
        };

        window.addEventListener("keydown", onOverviewKeyDown);
        return () => window.removeEventListener("keydown", onOverviewKeyDown);
    }, [viewMode, currentSlideIndex, moveSlide]);

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-h-[900px] bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Toolbar */}
            <div className="h-16 border-b flex items-center justify-between px-6 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-lg text-slate-800">{currentSlideIndex + 1} <span className="text-slate-400 font-normal">/ {slides.length}</span></h2>
                </div>

                {/* ... (Tool buttons remain same) ... */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode((prev) => (prev === "edit" ? "overview" : "edit"))}
                        className="text-slate-600 hover:text-teal-600 hover:bg-teal-50"
                        title={viewMode === "edit" ? "Open slide overview" : "Return to editor"}
                    >
                        {viewMode === "edit" ? <LayoutGrid className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-slate-600 hover:text-teal-600 hover:bg-teal-50"
                        aria-label="Toggle menu"
                        disabled={viewMode === "overview"}
                    >
                        {isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Create menu"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={handleInsertSlide} className="cursor-pointer">
                                <Plus className="h-4 w-4 text-blue-700" />
                                <span>Add Slide</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleAddAssessmentStep} className="cursor-pointer">
                                <ListChecks className="h-4 w-4 text-emerald-700" />
                                <span>Add Assessment</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSave(false)}
                        disabled={isSaving}
                        className="text-slate-600 hover:text-slate-800"
                        title="Save Draft"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteCurrentSlide}
                        disabled={slides.length <= 1}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40"
                        title="Delete this slide"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <Button onClick={handleGenerateVideo} disabled={isFinalizing || isRenderQueued} className="bg-teal-600 hover:bg-teal-700">
                        {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                        {isRenderQueued ? (renderStatusLabel || 'Queued') : 'Generate Video'}
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            {viewMode === "overview" ? (
                <div className="flex-1 min-h-0 overflow-y-auto bg-slate-100 p-5 md:p-6">
                    <div className="mx-auto w-full max-w-7xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-slate-800">Slides Overview</h3>
                                <p className="text-xs text-slate-500">Drag cards to reorder, use arrow buttons, or press Cmd/Ctrl + Shift + Up/Down.</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setOverviewDensity((prev) => (prev === "default" ? "compact" : "default"))}
                                className="h-8 w-8 p-0 text-slate-600"
                                title={overviewDensity === "default" ? "Zoom out overview" : "Zoom in overview"}
                                aria-label={overviewDensity === "default" ? "Zoom out overview" : "Zoom in overview"}
                            >
                                {overviewDensity === "default" ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                            </Button>
                        </div>

                        <div className={cn(
                            "grid gap-4",
                            overviewDensity === "default"
                                ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                                : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                        )}>
                            {slides.map((slide, index) => {
                                const narrationPreview = (slide.text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

                                return (
                                    <div
                                        key={`${slide.id ?? "slide"}-${index}`}
                                        draggable
                                        onDragStart={(e) => {
                                            setDragSlideIndex(index);
                                            e.dataTransfer.effectAllowed = "move";
                                            e.dataTransfer.setData("text/plain", String(index));
                                        }}
                                        onDragEnd={() => setDragSlideIndex(null)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDropReorder(index, e)}
                                        onClick={() => setCurrentSlideIndex(index)}
                                        className={cn(
                                            "rounded-xl border bg-white shadow-sm transition-all",
                                            index === currentSlideIndex
                                                ? "border-teal-300 ring-2 ring-teal-500/30"
                                                : "border-slate-200 hover:border-slate-300",
                                            dragSlideIndex === index ? "opacity-60" : "opacity-100",
                                            "cursor-pointer"
                                        )}
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCurrentSlideIndex(index);
                                                    setViewMode("edit");
                                                }}
                                                className="text-sm font-semibold text-slate-700 hover:text-teal-700"
                                            >
                                                Slide {index + 1}
                                            </button>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => moveSlide(index, index - 1)}
                                                    disabled={index === 0}
                                                    className="h-7 w-7 p-0"
                                                    title="Move slide up"
                                                >
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => moveSlide(index, index + 1)}
                                                    disabled={index === slides.length - 1}
                                                    className="h-7 w-7 p-0"
                                                    title="Move slide down"
                                                >
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                </Button>
                                                <div className="ml-1 cursor-grab rounded p-1 text-slate-400">
                                                    <GripVertical className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-3">
                                            <div className={cn(
                                                "overflow-hidden rounded-md border border-slate-200 bg-white",
                                                overviewDensity === "default" ? "aspect-video" : "aspect-[16/10]"
                                            )}>
                                                <VisualPreview slide={slide} />
                                            </div>
                                            {overviewDensity === "default" && (
                                                <p className="line-clamp-2 text-xs text-slate-600">
                                                    {narrationPreview || "No narration script yet."}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

                    {/* LEFT: VISUAL PREVIEW */}
                    <div className={cn(
                        "bg-slate-100 p-8 flex flex-col items-center justify-center relative border-r border-slate-200/50 transition-all duration-300 ease-in-out overflow-hidden",
                        isSidebarOpen ? "md:w-3/5" : "md:w-full"
                    )}>
                        <div className={cn(
                            "w-full aspect-video bg-white shadow-xl rounded-lg overflow-hidden border-4 border-white ring-1 ring-black/5 relative transition-all duration-300",
                            isSidebarOpen ? "max-w-[800px]" : "max-w-[1000px]"
                        )}>
                            <VisualPreview
                                slide={currentSlide}
                                onChartUpdate={(newData) => handleUpdateSlide("chart_data", newData)}
                                onTextChange={(val: string) => handleUpdateSlide("visual_text", val)}
                                onBackgroundChange={(val: string) => handleUpdateSlide("background_color", val)}
                                onSlideFieldChange={(field, value) => handleUpdateSlide(field as keyof Slide, value)}
                                narrationTokens={narrationTokens}
                                timingLinks={editorTimingLinks}
                                onTextTimingLinkAdd={upsertManualTimingLink}
                                onTextTimingLinkRemove={removeManualTimingLinkBySource}
                            />
                        </div>

                        {/* Navigation Arrows Floating */}
                        <button
                            onClick={handlePrev}
                            disabled={currentSlideIndex === 0}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md disabled:opacity-30 transition-all hover:scale-110"
                        >
                            <ChevronLeft className="h-6 w-6 text-slate-700" />
                        </button>

                        <button
                            onClick={handleNext}
                            disabled={currentSlideIndex === slides.length - 1}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md disabled:opacity-30 transition-all hover:scale-110"
                        >
                            <ChevronRight className="h-6 w-6 text-slate-700" />
                        </button>

                        {/* Scrub Bar */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 max-w-lg flex items-center gap-2 bg-white/50 backdrop-blur px-4 py-2 rounded-full">
                            <span className="text-xs font-medium text-slate-600 w-8 text-right">{currentSlideIndex + 1}</span>
                            <Slider
                                value={[currentSlideIndex]}
                                max={slides.length - 1}
                                step={1}
                                onValueChange={(val: number[]) => setCurrentSlideIndex(val[0])}
                                className="flex-1"
                            />
                            <span className="text-xs font-medium text-slate-400 w-8 text-left">{slides.length}</span>
                        </div>
                    </div>

                    {/* RIGHT: EDITOR PANEL */}
                    <div className={cn(
                        "min-h-0 transition-all duration-300 ease-in-out bg-white/50 scrollbar-thin scrollbar-thumb-slate-200",
                        isSidebarOpen ? "md:w-2/5 p-6 opacity-100 border-l overflow-y-auto overflow-x-hidden" : "w-0 p-0 opacity-0 border-none overflow-hidden"
                    )}>
                        <div className="space-y-4 max-w-lg mx-auto min-w-[300px]">

                        {/* 1. NARRATION SCRIPT */}
                        {!currentSlide.is_assessment && (
                            <SidebarSection
                                title="Narration Script"
                                icon={FileText}
                                iconColor="text-emerald-500"
                                isOpen={openSections.narration}
                                onToggle={() => toggleSection('narration')}
                                rightElement={
                                    <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-5">
                                        {currentSlide.text.split(" ").length} w
                                    </Badge>
                                }
                            >
                                <Textarea
                                    ref={narrationRef}
                                    value={currentSlide.text}
                                    onChange={(e) => handleUpdateSlide("text", e.target.value)}
                                    className={cn(commonTextAreaClass, "max-h-[40vh] overflow-y-auto")}
                                    placeholder="Enter the narration script for this slide..."
                                />
                            </SidebarSection>
                        )}

                        {currentSlide.is_assessment && currentAssessment && (
                            <SidebarSection
                                title="Assessment"
                                icon={ListChecks}
                                iconColor="text-emerald-600"
                                isOpen={openSections.assessment}
                                onToggle={() => toggleSection('assessment')}
                                rightElement={
                                    <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-5">
                                        {currentAssessment.options.length} options
                                    </Badge>
                                }
                            >
                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-slate-500">Question</label>
                                    <Textarea
                                        value={currentAssessment.question}
                                        onChange={(e) => updateAssessment({ question: e.target.value })}
                                        className={cn(commonTextAreaClass, "min-h-[84px]")}
                                        placeholder="Write the assessment question..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-slate-500">Answer Options</label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleAddAssessmentOption}
                                            className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50"
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add Option
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {currentAssessment.options.map((option, index) => (
                                            <div key={`assessment-option-${index}`} className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateAssessment({ correct_index: index })}
                                                    className={cn(
                                                        "h-6 w-6 rounded-full border text-[10px] font-bold transition-colors",
                                                        currentAssessment.correct_index === index
                                                            ? "bg-emerald-600 text-white border-emerald-600"
                                                            : "bg-white text-slate-500 border-slate-300 hover:border-emerald-400"
                                                    )}
                                                    title="Mark as correct answer"
                                                >
                                                    {String.fromCharCode(65 + index)}
                                                </button>
                                                <Input
                                                    value={option}
                                                    onChange={(e) => handleAssessmentOptionChange(index, e.target.value)}
                                                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                                    className="h-9"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={currentAssessment.options.length <= 2}
                                                    onClick={() => handleRemoveAssessmentOption(index)}
                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                                                    title="Remove option"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-slate-500">Explanation</label>
                                    <Textarea
                                        value={currentAssessment.explanation}
                                        onChange={(e) => updateAssessment({ explanation: e.target.value })}
                                        className={cn(commonTextAreaClass, "min-h-[96px]")}
                                        placeholder="Explain why the correct answer is right..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500">Points</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={currentAssessment.points}
                                        onChange={(e) => {
                                            const parsed = Number(e.target.value);
                                            updateAssessment({ points: Number.isFinite(parsed) && parsed > 0 ? parsed : 1 });
                                        }}
                                        className="h-9 w-24"
                                    />
                                </div>
                            </SidebarSection>
                        )}



                        {!currentSlide.is_assessment && (
                            <SidebarSection
                                title="Slide Type"
                                icon={PanelRightOpen}
                                iconColor="text-blue-500"
                                isOpen={openSections.slideType}
                                onToggle={() => toggleSection('slideType')}
                                rightElement={
                                    <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-5">
                                        {currentSlide.visual_type}
                                    </Badge>
                                }
                            >
                                <label className="text-xs font-semibold text-slate-500">Visual Type</label>
                                <select
                                    value={currentSlide.visual_type}
                                    onChange={(e) => handleVisualTypeChange(e.target.value)}
                                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                                >
                                    <option value="image">Image</option>
                                    <option value="hybrid">Hybrid</option>
                                    <option value="chart">Chart</option>
                                    <option value="kinetic_text">Kinetic Text</option>
                                    <option value="title_card">Title Card</option>
                                    <option value="comparison_split">Comparison Split</option>
                                    <option value="key_stat_breakout">Key Stat Breakout</option>
                                    <option value="document_anchor">Document Anchor</option>
                                    <option value="contextual_overlay">Contextual Overlay</option>
                                </select>

                                {currentSlide.visual_type === "chart" && (
                                    <>
                                        <label className="text-xs font-semibold text-slate-500">Chart Type</label>
                                        <select
                                            value={String((currentSlide.chart_data as Record<string, unknown> | undefined)?.archetype || "process")}
                                            onChange={(e) => handleChartArchetypeChange(e.target.value as ChartArchetype)}
                                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                                        >
                                            <option value="process">Process</option>
                                            <option value="cycle">Cycle</option>
                                            <option value="hierarchy">Hierarchy</option>
                                            <option value="comparison">Comparison</option>
                                            <option value="statistic">Statistic</option>
                                            <option value="grid">Grid</option>
                                            <option value="timeline">Timeline</option>
                                            <option value="funnel">Funnel</option>
                                            <option value="pyramid">Pyramid</option>
                                            <option value="mindmap">Mindmap</option>
                                            <option value="code">Code</option>
                                            <option value="math">Math</option>
                                            <option value="architecture">Architecture</option>
                                            <option value="matrix">Matrix</option>
                                            <option value="metaphor">Metaphor</option>
                                            <option value="anatomy">Anatomy</option>
                                            <option value="document-anchor">Document Anchor</option>
                                            <option value="contextual-overlay">Contextual Overlay</option>
                                        </select>
                                    </>
                                )}
                            </SidebarSection>
                        )}

                        {/* Slide Styling Section Removed: Now handled inline */}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
