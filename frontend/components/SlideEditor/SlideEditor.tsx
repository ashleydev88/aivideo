"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
    ChevronLeft,
    ChevronRight,
    Save,
    PlayCircle,
    Loader2,
    RefreshCcw,
    MonitorPlay,
    FileText,
    ImageIcon
} from "lucide-react";
import VisualPreview from "./VisualPreview";
import { createClient } from "@/lib/supabase/client";

interface Slide {
    id?: number; // Visual Director adds 1-based IDs
    slide_number: number;
    text: string;
    visual_text: string;
    layout: "split" | "text_only" | "image_only";
    visual_type: "image" | "hybrid" | "chart" | "kinetic_text" | "title_card";
    prompt: string;
    duration: number;
    image?: string;
    chart_data?: any;
    timestamps?: any;
    background_color?: string;
    text_color?: string;
}

interface SlideEditorProps {
    courseId: string;
    initialSlides: Slide[];
    onFinalize: () => void;
}

export default function SlideEditor({ courseId, initialSlides, onFinalize }: SlideEditorProps) {
    const [slides, setSlides] = useState<Slide[]>(initialSlides);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [regeneratingSlideIndex, setRegeneratingSlideIndex] = useState<number | null>(null);

    // Auto-save timer
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSave(true);
        }, 30000); // Auto-save every 30s
        return () => clearTimeout(timer);
    }, [slides]);

    const currentSlide = slides[currentSlideIndex];

    const handleUpdateSlide = (field: keyof Slide, value: any) => {
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

            const res = await fetch(`http://127.0.0.1:8000/regenerate-slide-visual/${courseId}`, {
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

    const handleSave = async (silent = false) => {
        setIsSaving(true);
        try {
            const supabase = createClient();
            await supabase
                .from("courses")
                .update({ slide_data: slides })
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
        setIsFinalizing(true);
        try {
            // Force save first
            await handleSave(true);

            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            const res = await fetch(`http://127.0.0.1:8000/finalize-course?course_id=${courseId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ slide_data: slides })
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

    const defaults = getSlideDefaults(currentSlide);

    // Collapsible Section State
    const [openSections, setOpenSections] = useState({
        narration: true,
        onScreenText: false,
        visualPrompt: false,
        styling: false
    });

    const toggleSection = (key: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
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
        icon: any,
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

    const commonTextAreaClass = "min-h-[120px] w-full p-3 rounded-md border border-slate-200 text-base text-slate-800 leading-relaxed shadow-sm focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-transparent transition-all resize-y";

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-h-[900px] bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Toolbar */}
            <div className="h-16 border-b flex items-center justify-between px-6 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-lg text-slate-800">Slide {currentSlideIndex + 1} <span className="text-slate-400 font-normal">/ {slides.length}</span></h2>
                    <Badge variant="outline" className="bg-white capitalize">{currentSlide.visual_type}</Badge>
                </div>

                {/* ... (Tool buttons remain same) ... */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleSave(false)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Save className="h-4 w-4 text-slate-500" />}
                        <span className="ml-2 hidden sm:inline text-slate-600">Save Draft</span>
                    </Button>
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <Button onClick={handleGenerateVideo} disabled={isFinalizing} className="bg-teal-600 hover:bg-teal-700">
                        {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                        Generate Video
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                {/* LEFT: VISUAL PREVIEW (60%) */}
                <div className="md:w-3/5 bg-slate-100 p-8 flex flex-col items-center justify-center relative border-r border-slate-200/50">
                    <div className="w-full max-w-[800px] aspect-video bg-white shadow-xl rounded-lg overflow-hidden border-4 border-white ring-1 ring-black/5 relative">
                        <VisualPreview slide={currentSlide} />
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

                {/* RIGHT: EDITOR PANEL (40%) */}
                <div className="md:w-2/5 p-6 overflow-y-auto bg-white/50 scrollbar-thin scrollbar-thumb-slate-200">
                    <div className="space-y-4 max-w-lg mx-auto">

                        {/* 1. NARRATION SCRIPT */}
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
                                value={currentSlide.text}
                                onChange={(e) => handleUpdateSlide("text", e.target.value)}
                                className={commonTextAreaClass}
                                placeholder="Enter the narration script for this slide..."
                            />
                        </SidebarSection>

                        {/* 2. ON-SCREEN TEXT */}
                        <SidebarSection
                            title="On-Screen Text"
                            icon={MonitorPlay}
                            iconColor="text-blue-500"
                            isOpen={openSections.onScreenText}
                            onToggle={() => toggleSection('onScreenText')}
                        >
                            <Textarea
                                value={currentSlide.visual_text}
                                onChange={(e) => handleUpdateSlide("visual_text", e.target.value)}
                                className={commonTextAreaClass}
                                placeholder="# Header&#10;- Bullet point"
                            />
                            <p className="text-[10px] text-slate-400 pl-1">
                                Markdown supported. Use # for headers, - for bullets.
                            </p>
                        </SidebarSection>


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

                        {currentSlide.visual_type === 'chart' && (
                            <SidebarSection
                                title="Chart Config"
                                icon={RefreshCcw}
                                iconColor="text-amber-500"
                                isOpen={openSections.visualPrompt} // Reusing visualPrompt state for chart config as they are mutually exclusive visual slots
                                onToggle={() => toggleSection('visualPrompt')}
                            >
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-md text-amber-800 text-sm">
                                    <p className="opacity-90 leading-relaxed">
                                        Chart data is automatically generated. <br />
                                        Edit the <strong>Narration Script</strong> above and regenerate to update the chart.
                                    </p>
                                </div>
                            </SidebarSection>
                        )}

                        {/* 4. SLIDE STYLING */}
                        <SidebarSection
                            title="Slide Styling"
                            icon={RefreshCcw} // Using generic icon or could import Palette
                            iconColor="text-teal-500"
                            isOpen={openSections.styling}
                            onToggle={() => toggleSection('styling')}
                        >
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Background</label>
                                    <div className="flex items-center gap-2 p-1.5 rounded-md border border-slate-100 bg-slate-50">
                                        <input
                                            type="color"
                                            value={currentSlide.background_color || defaults.bg}
                                            onChange={(e) => handleUpdateSlide("background_color", e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                        />
                                        <span className="text-xs font-mono text-slate-600 uppercase flex-1">{currentSlide.background_color || defaults.bg}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Text Color</label>
                                    <div className="flex items-center gap-2 p-1.5 rounded-md border border-slate-100 bg-slate-50">
                                        <input
                                            type="color"
                                            value={currentSlide.text_color || defaults.text}
                                            onChange={(e) => handleUpdateSlide("text_color", e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                        />
                                        <span className="text-xs font-mono text-slate-600 uppercase flex-1">{currentSlide.text_color || defaults.text}</span>
                                    </div>
                                </div>
                            </div>
                        </SidebarSection>

                    </div>
                </div>
            </div>
        </div>
    );
}
