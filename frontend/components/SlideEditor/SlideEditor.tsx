"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
    ChevronLeft,
    ChevronRight,
    Save,
    PlayCircle,
    Loader2,
    RefreshCcw,
    FileText,
    ImageIcon,
    PanelRightOpen,
    PanelRightClose,
    ListChecks,
    Plus,
    Trash2
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
    is_assessment?: boolean;
    assessment_data?: {
        question: string;
        options: string[];
        correct_index: number;
        explanation: string;
        points: number;
    };
}

type AssessmentData = NonNullable<Slide["assessment_data"]>;

interface SlideEditorProps {
    courseId: string;
    initialSlides: Slide[];
    onFinalize: () => void;
}

const commonTextAreaClass = "min-h-[120px] w-full p-3 rounded-md border border-slate-200 text-base text-slate-800 leading-relaxed shadow-sm focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-transparent transition-all resize-y";

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
    const [regeneratingSlideIndex, setRegeneratingSlideIndex] = useState<number | null>(null);
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

    const handleRegenerateVisual = async () => {
        if (!currentSlide.prompt) return;
        setRegeneratingSlideIndex(currentSlideIndex);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const res = await fetch(`${API_BASE_URL}/api/course/regenerate-slide-visual/${courseId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    prompt: currentSlide.prompt,
                    slide_index: currentSlideIndex
                })
            });

            if (res.ok) {
                const data = await res.json();
                handleUpdateSlide("image", data.image_url);
                // Also update visual_type back to image/hybrid if it was defaulted to something else? 
                // Actually the user intent is implicit.
            } else {
                alert("Failed to regenerate visual");
            }
        } catch (e) {
            console.error(e);
            alert("Error regenerating visual");
        } finally {
            setRegeneratingSlideIndex(null);
        }
    };

    const handleSave = async (silent = false, slidesToSave?: Slide[]) => {
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
    };

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
        const sourceSlide = slides[currentSlideIndex];
        const assessmentBackgroundColor = userBrandColor || "#ffffff";
        const assessmentTextColor = userBrandColor ? "#ffffff" : "#0f172a";
        const newSlide: Slide = {
            slide_number: currentSlideIndex + 2,
            text: "Quick check. Review the options and choose the best answer.",
            visual_text: "<h2>Quick Check</h2><p>Read the question and choose one answer.</p>",
            layout: "text_only",
            visual_type: "title_card",
            prompt: "",
            duration: 20000,
            background_color: assessmentBackgroundColor,
            text_color: assessmentTextColor,
            is_assessment: true,
            assessment_data: {
                question: `Which option best applies after "${(sourceSlide.visual_text || sourceSlide.text || "this step").toString().replace(/<[^>]*>/g, "").slice(0, 80)}"?`,
                options: [
                    "Option A",
                    "Option B",
                    "Option C"
                ],
                correct_index: 0,
                explanation: "Replace this with the rationale for the correct answer.",
                points: 1
            }
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

    const handleDeleteCurrentSlide = () => {
        if (slides.length <= 1) {
            alert("You need at least one slide in the course.");
            return;
        }

        const shouldDelete = window.confirm(`Delete slide ${currentSlideIndex + 1}? This action cannot be undone.`);
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
        narration: true,
        assessment: true,
        onScreenText: false,
        visualPrompt: false,
        styling: false
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSection = (key: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const getAssessmentData = (slide: Slide): AssessmentData => {
        return slide.assessment_data || {
            question: "",
            options: ["Option A", "Option B", "Option C"],
            correct_index: 0,
            explanation: "",
            points: 1
        };
    };

    const buildAssessmentVisualText = (assessment: AssessmentData): string => {
        const optionsHtml = assessment.options
            .map((option, idx) => `<p>${String.fromCharCode(65 + idx)}. ${option || "Option"}</p>`)
            .join("");

        return `<h2>${assessment.question || "Quick Check"}</h2>${optionsHtml}`;
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
    const sidebarPanelLabel = currentSlide?.is_assessment ? "Assessment" : "Narration";

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-h-[900px] bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Toolbar */}
            <div className="h-16 border-b flex items-center justify-between px-6 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-lg text-slate-800">{currentSlideIndex + 1} <span className="text-slate-400 font-normal">/ {slides.length}</span></h2>
                </div>

                {/* ... (Tool buttons remain same) ... */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleSave(false)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Save className="h-4 w-4 text-slate-500" />}
                        <span className="ml-2 hidden sm:inline text-slate-600">Save Draft</span>
                    </Button>
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-slate-600 hover:text-teal-600 hover:bg-teal-50"
                    >
                        {isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                        <span className="ml-2 hidden sm:inline">{isSidebarOpen ? `Close ${sidebarPanelLabel}` : `Open ${sidebarPanelLabel}`}</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAddAssessmentStep}
                        className="text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                        title="Insert an assessment slide after this step"
                    >
                        <ListChecks className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">Add Assessment Step</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteCurrentSlide}
                        disabled={slides.length <= 1}
                        className="text-slate-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-40"
                        title="Delete this slide"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">Delete Slide</span>
                    </Button>
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <Button onClick={handleGenerateVideo} disabled={isFinalizing || isRenderQueued} className="bg-teal-600 hover:bg-teal-700">
                        {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                        {isRenderQueued ? (renderStatusLabel || 'Queued') : 'Generate Video'}
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
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



                        {/* 3. VISUAL PROMPT / CHART CONFIG */}
                        {['image', 'hybrid'].includes(currentSlide.visual_type) && (
                            <SidebarSection
                                title="Visual Prompt"
                                icon={ImageIcon}
                                iconColor="text-purple-500"
                                isOpen={openSections.visualPrompt}
                                onToggle={() => toggleSection('visualPrompt')}
                                rightElement={
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handleRegenerateVisual(); }}
                                        disabled={regeneratingSlideIndex === currentSlideIndex}
                                        className="h-6 text-[10px] px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                    >
                                        <RefreshCcw className={`h-3 w-3 mr-1 ${regeneratingSlideIndex === currentSlideIndex ? "animate-spin" : ""}`} />
                                        {regeneratingSlideIndex === currentSlideIndex ? "Gen..." : "Regenerate"}
                                    </Button>
                                }
                            >
                                <Textarea
                                    value={currentSlide.prompt}
                                    onChange={(e) => handleUpdateSlide("prompt", e.target.value)}
                                    className={commonTextAreaClass}
                                    placeholder="Describe the image..."
                                />
                            </SidebarSection>
                        )}

                        {/* Slide Styling Section Removed: Now handled inline */}

                    </div>
                </div>
            </div>
        </div>
    );
}
