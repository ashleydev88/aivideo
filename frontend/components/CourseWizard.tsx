"use client";

import { createClient } from "@/lib/supabase/client";
import React, { useState, useRef, useEffect } from "react";
import {
    Send,
    Paperclip,
    X,
    FileText,
    CheckCircle2,
    User,
    Target,
    Clock,
    Palette,
    ChevronRight,
    Loader2,
    Briefcase,
    Sparkles,
    Brain,
    Plus,
    Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Types corresponding to backend
type TargetAudience = "new_hires" | "all_employees" | "leadership";

interface WizardState {
    // Discovery fields
    topic: string;
    audience: TargetAudience | null;
    outcomes: string[];
    additionalContext: string;

    // Configuration fields
    hasDocuments: boolean | null;
    documents: File[];
    documentText: string;
    duration: number | null;
    style: string | null;
    accentColor: string;
    colorName: string;
    title: string;
    forcedFormat?: "single_video" | "multi_video_course";
    plannerRecommendation?: {
        format: "single_video" | "multi_video_course";
        rationale?: string;
        estimated_total_minutes?: number;
        modules?: Array<{
            order: number;
            title: string;
            estimated_minutes: number;
        }>;
    } | null;
    durationMode?: "fit_requested" | "fit_recommended";
}

interface Message {
    id: string;
    role: "assistant" | "user";
    content: string;
    step?: string;
}

interface CourseWizardProps {
    onComplete: (data: WizardState) => void;
    isLoading?: boolean;
    country?: "USA" | "UK";
    brandColor?: string | null;
}

const STEPS = [
    "WELCOME",
    "TOPIC",
    "AUDIENCE",
    "OUTCOMES",
    "DOCUMENTS_CHECK",
    "DOCUMENTS_UPLOAD",
    "ADDITIONAL",
    "STYLE",
    "TITLE",
    "REVIEW"
] as const;

type Step = typeof STEPS[number];

export default function CourseWizard({ onComplete, isLoading = false, country = "UK", brandColor }: CourseWizardProps) {
    // --- State ---
    const [currentStep, setCurrentStep] = useState<Step>("WELCOME");
    const [history, setHistory] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    // Data Loading States
    const [isLoadingOutcomes, setIsLoadingOutcomes] = useState(false);
    const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
    const [suggestedOutcomes, setSuggestedOutcomes] = useState<string[]>([]);
    const [customOutcome, setCustomOutcome] = useState("");

    const [state, setState] = useState<WizardState>({
        topic: "",
        audience: null,
        outcomes: [],
        additionalContext: "",
        hasDocuments: null,
        documents: [],
        documentText: "",
        duration: null,
        style: "Minimalist Vector",
        accentColor: brandColor || "#14b8a6", // Init with brandColor
        colorName: "teal",
        title: "",
        forcedFormat: undefined,
        plannerRecommendation: null,
        durationMode: "fit_requested",
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

    const autoResizeTextarea = (el: HTMLTextAreaElement) => {
        el.style.height = "auto";
        const minHeight = 96; // 4 lines
        const maxHeight = 176; // 8 lines
        const nextHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
        el.style.height = `${nextHeight}px`;
        el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    };

    const audienceLabel = (audience: TargetAudience) => {
        if (audience === "new_hires") return "New Hires";
        if (audience === "all_employees") return "All Employees";
        return "Leadership";
    };

    const splitOutcomes = (text: string): string[] => {
        return text
            .split(/,|;|\band\b/gi)
            .map((s) => s.trim().replace(/^[-•]\s*/, "").replace(/\.$/, ""))
            .filter((s) => s.length >= 3)
            .slice(0, 8);
    };

    const extractIntentFromTopicInput = (rawInput: string): {
        topic: string;
        audience: TargetAudience | null;
        outcomes: string[];
    } => {
        const input = rawInput.trim();
        const lower = input.toLowerCase();

        let audience: TargetAudience | null = null;
        if (/\b(leadership|leaders?|managers?|people managers?)\b/.test(lower)) {
            audience = "leadership";
        } else if (/\b(new hires?|onboarding|starters?)\b/.test(lower)) {
            audience = "new_hires";
        } else if (/\b(all employees|everyone|entire company|all staff)\b/.test(lower)) {
            audience = "all_employees";
        }

        let outcomes: string[] = [];
        const outcomesPatterns = [
            /learning outcomes?\s*(?:are|:)?\s*(.+)$/i,
            /outcomes?\s*(?:include|:)\s*(.+)$/i,
            /\bfor\s+(.+?)\s+learning outcomes?\b/i,
        ];
        for (const pattern of outcomesPatterns) {
            const m = input.match(pattern);
            if (m?.[1]) {
                outcomes = splitOutcomes(m[1]);
                if (outcomes.length > 0) break;
            }
        }

        let topic = input;
        const topicPatterns = [
            /\bon\s+(.+?)(?:,\s*for\s+.+learning outcomes?.*|$)/i,
            /\babout\s+(.+?)(?:,\s*for\s+.+learning outcomes?.*|$)/i,
        ];
        for (const pattern of topicPatterns) {
            const m = input.match(pattern);
            if (m?.[1]) {
                const candidate = m[1].trim().replace(/[.?!]+$/, "");
                if (candidate.length >= 3) {
                    topic = candidate;
                    break;
                }
            }
        }

        return { topic, audience, outcomes };
    };

    // --- Effects ---

    // Scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, isTyping]);

    // Initial Greeting
    useEffect(() => {
        if (!hasInitialized.current && history.length === 0) {
            hasInitialized.current = true;
            addBotMessage("Hi there! I'm your AI Instructional Designer.", "WELCOME");
            setTimeout(() => {
                addBotMessage("I can help you build a high-impact video course. First, what topic should this training cover?", "TOPIC");
                setCurrentStep("TOPIC");
            }, 800);
        }
    }, []);

    // --- Helpers ---

    const addBotMessage = (content: string, step?: string, delay: number = 600) => {
        setIsTyping(true);
        // Simulate thinking time for realism
        setTimeout(() => {
            setIsTyping(false);
            setHistory(prev => [...prev, {
                id: Math.random().toString(36).substring(7),
                role: "assistant",
                content,
                step
            }]);
        }, delay);
    };

    const addUserMessage = (content: string) => {
        setHistory(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            role: "user",
            content
        }]);
    };

    // --- Step Handlers ---

    const handleTopicSubmit = (topic: string) => {
        if (!topic.trim()) return;
        addUserMessage(topic);

        const extracted = extractIntentFromTopicInput(topic);
        const nextTopic = extracted.topic || topic;
        const nextAudience = extracted.audience;
        const nextOutcomes = extracted.outcomes;

        setState(prev => ({
            ...prev,
            topic: nextTopic,
            audience: nextAudience ?? prev.audience,
            outcomes: nextOutcomes.length ? nextOutcomes : prev.outcomes,
        }));

        // If both audience and outcomes are captured in free text, skip redundant questions.
        if (nextAudience && nextOutcomes.length > 0) {
            setSuggestedOutcomes(nextOutcomes);
            setCurrentStep("DOCUMENTS_CHECK");
            addBotMessage(
                `I captured audience as ${audienceLabel(nextAudience)} and ${nextOutcomes.length} learning outcomes. Do you have any documents to include?`,
                "DOCUMENTS_CHECK"
            );
            return;
        }

        // If audience is captured, skip audience question and go straight to outcomes.
        if (nextAudience) {
            setCurrentStep("OUTCOMES");
            addBotMessage(`Got it, audience looks like ${audienceLabel(nextAudience)}. I'll suggest learning outcomes next.`, "OUTCOMES");
            fetchOutcomeSuggestions(nextTopic, nextAudience);
            return;
        }

        setCurrentStep("AUDIENCE");
        addBotMessage("Got it. Who is the primary audience for this training?", "AUDIENCE");
    };

    const handleAudienceSelect = (audience: TargetAudience, label: string) => {
        addUserMessage(label);
        setState(prev => ({ ...prev, audience }));
        setCurrentStep("OUTCOMES");

        // Trigger AI suggestions
        fetchOutcomeSuggestions(state.topic, audience);
    };

    const fetchOutcomeSuggestions = async (topic: string, audience: string) => {
        addBotMessage("Analyzing your topic and audience to suggest learning outcomes...", "OUTCOMES");
        setIsLoadingOutcomes(true);

        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/course/suggest-outcomes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ topic, audience, country })
            });

            if (res.ok) {
                const data = await res.json();
                setSuggestedOutcomes(data.suggestions || []);
                // Select first 3 by default
                const defaults = (data.suggestions || []).slice(0, 3);
                setState(prev => ({ ...prev, outcomes: defaults }));

                // Add follow up message immediately (0 delay) so it appears with the chips
                addBotMessage("Here are some recommended learning outcomes. Select the ones you want to include, or add your own.", "OUTCOMES", 0);
            } else {
                throw new Error("Failed to fetch");
            }
        } catch (err) {
            console.error(err);
            setSuggestedOutcomes([
                `Understand key concepts of ${topic}`,
                `Apply ${topic} best practices`,
                `Identify common risks and issues`
            ]);
            // Also show message in error case, instantly
            addBotMessage("Here are some generalized outcomes. You can add your own.", "OUTCOMES", 0);
        } finally {
            setIsLoadingOutcomes(false);
        }
    };

    const toggleOutcome = (outcome: string) => {
        setState(prev => {
            const exists = prev.outcomes.includes(outcome);
            if (exists) {
                return { ...prev, outcomes: prev.outcomes.filter(o => o !== outcome) };
            } else {
                return { ...prev, outcomes: [...prev.outcomes, outcome] };
            }
        });
    };

    const handleAddCustomOutcome = () => {
        if (customOutcome.trim()) {
            if (!state.outcomes.includes(customOutcome.trim())) {
                setState(prev => ({ ...prev, outcomes: [...prev.outcomes, customOutcome.trim()] }));
                // Also add to suggestions list so it appears as a chip
                setSuggestedOutcomes(prev => [...prev, customOutcome.trim()]);
            }
            setCustomOutcome("");
        }
    };

    const handleOutcomesSubmit = () => {
        const count = state.outcomes.length;
        addUserMessage(`Selected ${count} outcome${count !== 1 ? 's' : ''}`);
        setCurrentStep("DOCUMENTS_CHECK");
        addBotMessage("Noted. Do you have any existing company policies or documents to include?", "DOCUMENTS_CHECK");
    };

    const handleDocumentCheck = (hasDocs: boolean) => {
        addUserMessage(hasDocs ? "Yes, I have documents" : "No documents");
        setState(prev => ({ ...prev, hasDocuments: hasDocs }));

        if (hasDocs) {
            setCurrentStep("DOCUMENTS_UPLOAD");
            addBotMessage("Please upload them below (PDF, DOCX, TXT). I'll extract the relevant details.", "DOCUMENTS_UPLOAD");
        } else {
            setCurrentStep("ADDITIONAL");
            addBotMessage("No problem. Is there any additional context or specific focus you'd like to mention?", "ADDITIONAL");
        }
    };

    const handleAdditionalContextSubmit = (text: string) => {
        const msg = text.trim() ? text : "None";
        addUserMessage(msg);
        setState(prev => ({ ...prev, additionalContext: text }));
        setCurrentStep("STYLE");
        addBotMessage("Thanks. Choose a visual style for the video.", "STYLE");
    };

    const handleStyleSelect = (style: string, defaultColor: string, colorName: string) => {
        // Use brandColor if available, otherwise use style's default color
        const colorToUse = brandColor || defaultColor;
        // If using brandColor, we might want to keep the colorName as generic or "Brand" 
        // but keeping it as the style default name is safer for prompt engineering unless we map it.
        // Actually, the backend uses colorName for prompts. "teal", "blue" etc. 
        // If we switch to a hex brandColor, we might want to update colorName to "custom" or similar?
        // But for now, let's just update the accentColor hex. The colorName is less critical for the visual renderer which uses hex.

        addUserMessage(`${style}`);
        setState(prev => ({ ...prev, style, accentColor: colorToUse, colorName }));
        setCurrentStep("TITLE");
        addBotMessage("Almost done! What should we name this course?", "TITLE");
    };

    const handleTitleSubmit = (title: string) => {
        // Correcting the logic here slightly to ensure smooth flow
        const courseTitle = title.trim() || state.topic; // Default to topic if empty? No, require input usually.
        if (!courseTitle) return;

        addUserMessage(courseTitle);
        const finalState = { ...state, title: courseTitle };
        setState(finalState);
        setCurrentStep("REVIEW");
        fetchPlannerRecommendation(finalState);
        addBotMessage("Here's the plan. Ready to generate the course?", "REVIEW");
    };

    const fetchPlannerRecommendation = async (wizardState: WizardState) => {
        if (!wizardState.topic || !wizardState.audience) return;
        setIsLoadingRecommendation(true);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/course/planner/recommend`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    topic: wizardState.topic,
                    target_audience: wizardState.audience,
                    learning_objectives: wizardState.outcomes,
                    additional_context: wizardState.additionalContext,
                    source_document_text: wizardState.documentText,
                    duration_preference_minutes: wizardState.duration,
                    country
                })
            });
            if (!res.ok) throw new Error("Failed to get planner recommendation");
            const data = await res.json();
            const recommendation = data?.recommendation || null;
            const recommendedMins = recommendation?.estimated_total_minutes ?? null;
            const durationDefault = wizardState.duration ?? (typeof recommendedMins === "number" ? recommendedMins : 5);
            setState(prev => ({
                ...prev,
                plannerRecommendation: recommendation,
                forcedFormat: undefined,
                duration: durationDefault,
                durationMode: "fit_requested"
            }));
        } catch (e) {
            console.error("Planner recommendation error", e);
        } finally {
            setIsLoadingRecommendation(false);
        }
    };

    // --- Renderers ---

    const renderOptions = () => {
        if (isTyping) return null;

        switch (currentStep) {
            case "TOPIC":
                return (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex-1 relative">
                        <textarea
                            rows={4}
                            className="w-full border rounded-lg px-4 py-2 text-sm font-normal leading-5 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none resize-none min-h-[96px] max-h-[176px] overflow-y-hidden"
                            placeholder="e.g., Cyber Security Awareness"
                            onInput={(e) => autoResizeTextarea(e.currentTarget)}
                            onFocus={(e) => autoResizeTextarea(e.currentTarget)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleTopicSubmit(e.currentTarget.value);
                                }
                            }}
                            autoFocus
                        />
                        <div className="absolute bottom-2 right-2 text-[10px] text-slate-400">
                            Enter to submit, Shift+Enter for newline
                        </div>
                        </div>
                        <Button onClick={(e) => {
                            const input = (e.currentTarget.previousSibling as HTMLDivElement)?.querySelector("textarea");
                            if (!input) return;
                            handleTopicSubmit(input.value);
                        }}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                );

            case "AUDIENCE":
                return (
                    <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <OptionCard
                            icon={<User className="w-5 h-5 text-emerald-500" />}
                            title="New Hires"
                            desc="Welcome & orientation - accessible introduction for new starters"
                            onClick={() => handleAudienceSelect("new_hires", "New Hires")}
                        />
                        <OptionCard
                            icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />}
                            title="All Employees"
                            desc="Company-wide training - clear requirements and actions for everyone"
                            onClick={() => handleAudienceSelect("all_employees", "All Employees")}
                        />
                        <OptionCard
                            icon={<Target className="w-5 h-5 text-purple-500" />}
                            title="Leadership"
                            desc="Managers & Leaders - implementation, decisions, and team guidance"
                            onClick={() => handleAudienceSelect("leadership", "Leadership")}
                        />
                    </div>
                );

            case "OUTCOMES":
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 w-full">
                        {isLoadingOutcomes ? (
                            <div className="flex items-center gap-2 text-slate-500 text-sm p-4 justify-center bg-slate-50 rounded-lg border border-dashed">
                                <Sparkles className="w-4 h-4 animate-spin text-teal-500" />
                                Analyzing topic for suggestions...
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {suggestedOutcomes.map((outcome, idx) => {
                                        const isSelected = state.outcomes.includes(outcome);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => toggleOutcome(outcome)}
                                                className={cn(
                                                    "px-3 py-2 text-sm rounded-full border transition-all text-left",
                                                    isSelected
                                                        ? "bg-teal-50 border-teal-500 text-teal-700 font-medium ring-1 ring-teal-200 shadow-sm"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-slate-50"
                                                )}
                                            >
                                                {isSelected && <Check className="w-3 h-3 inline mr-1.5" />}
                                                {outcome}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <input
                                        type="text"
                                        value={customOutcome}
                                        onChange={(e) => setCustomOutcome(e.target.value)}
                                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                        placeholder="Add custom outcome..."
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleAddCustomOutcome();
                                        }}
                                    />
                                    <Button size="sm" variant="outline" onClick={handleAddCustomOutcome}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>

                                <Button
                                    className="w-full bg-teal-600 hover:bg-teal-700 mt-2"
                                    onClick={handleOutcomesSubmit}
                                >
                                    Continue ({state.outcomes.length} Selected)
                                </Button>
                            </div>
                        )}
                    </div>
                );

            case "DOCUMENTS_CHECK":
                return (
                    <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4">
                        <Button onClick={() => handleDocumentCheck(true)} className="flex-1 bg-teal-600 hover:bg-teal-700">
                            <Paperclip className="w-4 h-4 mr-2" />
                            Yes, upload files
                        </Button>
                        <Button variant="outline" onClick={() => handleDocumentCheck(false)} className="flex-1">
                            No, start from scratch
                        </Button>
                    </div>
                );

            case "DOCUMENTS_UPLOAD":
                return (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <FileUploader
                            onUploadComplete={(files, text) => {
                                setState(prev => ({ ...prev, documents: files, documentText: text }));
                                setCurrentStep("ADDITIONAL");
                                addBotMessage(`Received ${files.length} document(s). Is there any additional context?`, "ADDITIONAL");
                            }}
                        />
                    </div>
                );

            case "ADDITIONAL":
                return (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-4 w-full">
                        <div className="flex-1 relative">
                            <textarea
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none resize-none h-24 text-sm"
                                placeholder="e.g., Focus specifically on remote work scenarios..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAdditionalContextSubmit(e.currentTarget.value);
                                    }
                                }}
                                autoFocus
                            />
                            <div className="absolute bottom-2 right-2 text-[10px] text-slate-400">
                                Press Enter to submit
                            </div>
                        </div>
                        <Button className="h-24 self-start" onClick={(e) => {
                            const input = e.currentTarget.previousSibling?.firstChild as HTMLTextAreaElement;
                            handleAdditionalContextSubmit(input.value);
                        }}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                );

            case "STYLE":
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-1 gap-3">
                            <StyleOption
                                title="Minimalist Vector"
                                desc="Clean, modern, flat illustrations"
                                isSelected={state.style === "Minimalist Vector"}
                                imageUrl="https://ctkhjhfmwttpjtmtqjdh.supabase.co/storage/v1/object/sign/global-assets/Minimalist%20sample.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZjM2ZjBlYi1hYjBiLTQ5NjQtOGE0My1hMmEyZGUzOGM4NWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnbG9iYWwtYXNzZXRzL01pbmltYWxpc3Qgc2FtcGxlLndlYnAiLCJpYXQiOjE3Njk5Mzk5ODgsImV4cCI6MzMzMDU5Mzk5ODh9.5MV0t6uw2O4FLks1rQSVFFw3QXmExl7GPJ1s6YjPFws"
                                onClick={() => handleStyleSelect("Minimalist Vector", "#14b8a6", "teal")}
                            />
                            <StyleOption
                                title="Photo Realistic"
                                desc="Cinematic, professional photography"
                                isSelected={state.style === "Photo Realistic"}
                                imageUrl="https://ctkhjhfmwttpjtmtqjdh.supabase.co/storage/v1/object/sign/global-assets/Photo%20realistic%20sample.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZjM2ZjBlYi1hYjBiLTQ5NjQtOGE0My1hMmEyZGUzOGM4NWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnbG9iYWwtYXNzZXRzL1Bob3RvIHJlYWxpc3RpYyBzYW1wbGUud2VicCIsImlhdCI6MTc2OTk0MDAxMywiZXhwIjozMzMwNTk0MDAxM30.UwiS-B335Drv7MkFHaHPiBUww9sUXg-GbzMupqAedMI"
                                onClick={() => handleStyleSelect("Photo Realistic", "#3b82f6", "blue")}
                            />
                            <StyleOption
                                title="Sophisticated Watercolour"
                                desc="Artistic, hand-drawn aesthetic"
                                isSelected={state.style === "Sophisticated Watercolour"}
                                imageUrl="https://ctkhjhfmwttpjtmtqjdh.supabase.co/storage/v1/object/sign/global-assets/Tech%20isometric%20sample.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZjM2ZjBlYi1hYjBiLTQ5NjQtOGE0My1hMmEyZGUzOGM4NWQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnbG9iYWwtYXNzZXRzL1RlY2ggaXNvbWV0cmljIHNhbXBsZS53ZWJwIiwiaWF0IjoxNzY5OTQwMDQwLCJleHAiOjMzMzA1OTQwMDQwfQ.6LZ74_pla-2TdLCdxo1FAf0HdeJKv1YfdTTVoXLqXhk"
                                onClick={() => handleStyleSelect("Sophisticated Watercolour", "#0ea5e9", "sky blue")}
                            />
                        </div>
                    </div>
                );
            case "TITLE":
                return (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex-1 relative">
                        <textarea
                            rows={4}
                            className="w-full border rounded-lg px-4 py-2 text-sm font-normal leading-5 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none resize-none min-h-[96px] max-h-[176px] overflow-y-hidden"
                            placeholder="e.g., Q3 Safety Compliance"
                            onInput={(e) => autoResizeTextarea(e.currentTarget)}
                            onFocus={(e) => autoResizeTextarea(e.currentTarget)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleTitleSubmit(e.currentTarget.value);
                                }
                            }}
                        />
                        <div className="absolute bottom-2 right-2 text-[10px] text-slate-400">
                            Enter to submit, Shift+Enter for newline
                        </div>
                        </div>
                        <Button onClick={(e) => {
                            const input = (e.currentTarget.previousSibling as HTMLDivElement)?.querySelector("textarea");
                            if (!input) return;
                            handleTitleSubmit(input.value);
                        }}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                );

            case "REVIEW":
                const recommendedFormat = state.plannerRecommendation?.format;
                const selectedFormat = state.forcedFormat || recommendedFormat;
                const recommendedMinutes = state.plannerRecommendation?.estimated_total_minutes || 0;
                const selectedDuration = state.duration || 5;
                const durationTooShort = recommendedMinutes > 0 && selectedDuration < recommendedMinutes;
                const finalDuration = durationTooShort && state.durationMode === "fit_recommended"
                    ? recommendedMinutes
                    : selectedDuration;
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm space-y-2 border">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Topic:</span>
                                <span className="font-medium">{state.topic}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Audience:</span>
                                <span className="font-medium capitalize">{state.audience?.replace('_', ' ')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Duration:</span>
                                <span className="font-medium">{finalDuration} mins</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Outcomes:</span>
                                <span className="font-medium">{state.outcomes.length} selected</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Documents:</span>
                                <span className="font-medium">{state.hasDocuments ? `${state.documents.length} files` : "None"}</span>
                            </div>
                            {state.additionalContext && (
                                <div className="pt-2 mt-2 border-t">
                                    <span className="text-slate-500 text-xs uppercase block mb-1">Context:</span>
                                    <span className="font-medium block text-xs text-slate-700">{state.additionalContext}</span>
                                </div>
                            )}
                        </div>
                        <div className="bg-white border rounded-lg p-4 mb-4 space-y-3">
                            <div className="text-xs uppercase tracking-wide text-slate-500">Planner Recommendation</div>
                            {isLoadingRecommendation ? (
                                <div className="text-sm text-slate-500">Analyzing best structure...</div>
                            ) : (
                                <>
                                    <div className="text-sm">
                                        Recommended:{" "}
                                        <span className="font-semibold text-slate-900">
                                            {recommendedFormat === "multi_video_course" ? "Multi-video course" : "Single video"}
                                        </span>
                                    </div>
                                    {state.plannerRecommendation?.rationale && (
                                        <div className="text-xs text-slate-600">{state.plannerRecommendation.rationale}</div>
                                    )}
                                    <div className="pt-1">
                                        <div className="text-xs text-slate-500 mb-2">How much learner time is available?</div>
                                        <div className="grid grid-cols-5 gap-2">
                                            {[3, 5, 10, 15, 20].map((min) => (
                                                <button
                                                    key={min}
                                                    type="button"
                                                    onClick={() => setState(prev => ({ ...prev, duration: min }))}
                                                    className={cn(
                                                        "border rounded-md px-2 py-1 text-xs transition",
                                                        selectedDuration === min
                                                            ? "border-teal-500 bg-teal-50 text-teal-700"
                                                            : "border-slate-200 hover:border-slate-300"
                                                    )}
                                                >
                                                    {min}m
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {durationTooShort && (
                                        <div className="border border-amber-200 bg-amber-50 rounded-md p-2 text-xs space-y-2">
                                            <div className="text-amber-800">
                                                {selectedDuration} minutes is below recommended coverage ({recommendedMinutes} minutes).
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setState(prev => ({ ...prev, durationMode: "fit_recommended" }))}
                                                    className={cn(
                                                        "border rounded-md px-3 py-2 text-left",
                                                        state.durationMode === "fit_recommended"
                                                            ? "border-amber-500 bg-white text-amber-900"
                                                            : "border-amber-200"
                                                    )}
                                                >
                                                    Keep full coverage (use ~{recommendedMinutes} minutes)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setState(prev => ({ ...prev, durationMode: "fit_requested" }))}
                                                    className={cn(
                                                        "border rounded-md px-3 py-2 text-left",
                                                        state.durationMode === "fit_requested"
                                                            ? "border-amber-500 bg-white text-amber-900"
                                                            : "border-amber-200"
                                                    )}
                                                >
                                                    Fit to {selectedDuration} minutes (reduced depth)
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setState(prev => ({ ...prev, forcedFormat: "single_video" }))}
                                            className={cn(
                                                "border rounded-md px-3 py-2 text-sm text-left transition",
                                                selectedFormat === "single_video"
                                                    ? "border-teal-500 bg-teal-50 text-teal-700"
                                                    : "border-slate-200 hover:border-slate-300"
                                            )}
                                        >
                                            Single video
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setState(prev => ({ ...prev, forcedFormat: "multi_video_course" }))}
                                            className={cn(
                                                "border rounded-md px-3 py-2 text-sm text-left transition",
                                                selectedFormat === "multi_video_course"
                                                    ? "border-teal-500 bg-teal-50 text-teal-700"
                                                    : "border-slate-200 hover:border-slate-300"
                                            )}
                                        >
                                            Multi-video course
                                        </button>
                                    </div>
                                    {state.plannerRecommendation?.modules?.length ? (
                                        <div className="pt-1">
                                            <div className="text-xs text-slate-500 mb-1">Suggested modules</div>
                                            <div className="space-y-1">
                                                {state.plannerRecommendation.modules.slice(0, 5).map((m, idx) => (
                                                    <div key={`${m.title}-${idx}`} className="text-xs text-slate-700">
                                                        {idx + 1}. {m.title} ({m.estimated_minutes} min)
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </div>
                        <Button
                            className="w-full bg-teal-600 hover:bg-teal-700 text-lg py-6"
                            onClick={() => onComplete({
                                ...state,
                                duration: finalDuration
                            })}
                            disabled={isLoading || isLoadingRecommendation}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Generatng Plan...
                                </>
                            ) : (
                                "Start Generation"
                            )}
                        </Button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col bg-white rounded-2xl shadow-xl border overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b bg-slate-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                    AI
                </div>
                <div>
                    <h2 className="font-semibold text-slate-800">New Course Wizard</h2>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Online
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 min-h-[200px] max-h-[60vh]"
            >
                {history.map((msg) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id}
                        className={cn(
                            "flex gap-3 max-w-[85%]",
                            msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                        )}
                    >
                        {msg.role === "assistant" && (
                            <Avatar className="w-8 h-8 border bg-white">
                                <AvatarImage src="/bot-avatar.png" />
                                <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">AI</AvatarFallback>
                            </Avatar>
                        )}

                        <div className={cn(
                            "p-3 rounded-2xl text-sm leading-relaxed",
                            msg.role === "assistant"
                                ? "bg-white border text-slate-700 rounded-tl-none shadow-sm"
                                : "bg-teal-600 text-white rounded-tr-none shadow-md"
                        )}>
                            {msg.content}
                        </div>
                    </motion.div>
                ))}

                {isTyping && (
                    <div className="flex gap-3">
                        <Avatar className="w-8 h-8 border bg-white">
                            <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">AI</AvatarFallback>
                        </Avatar>
                        <div className="bg-white border p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t min-h-[140px]">
                {renderOptions()}
            </div>
        </div>
    );
}

// --- Subcomponents ---

function OptionCard({ icon, title, desc, onClick }: { icon: React.ReactNode, title: string, desc: string, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="flex items-start gap-3 p-3 border rounded-xl hover:border-teal-500 hover:bg-teal-50 cursor-pointer transition-all group"
        >
            <div className="mt-1 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div>
                <div className="font-medium text-slate-900 text-sm">{title}</div>
                <div className="text-xs text-slate-500 leading-tight mt-1">{desc}</div>
            </div>
            <ChevronRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-teal-500 mt-2" />
        </div>
    );
}

function StyleOption({ title, desc, isSelected, imageUrl, onClick }: { title: string, desc: string, isSelected: boolean, imageUrl: string, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center gap-4 p-3 border rounded-xl cursor-pointer transition-all",
                isSelected ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500" : "hover:border-teal-500"
            )}
        >
            <div className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100">
                <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            </div>
            <div>
                <div className="font-medium text-sm">{title}</div>
                <div className="text-xs text-slate-500">{desc}</div>
            </div>
        </div>
    )
}

function FileUploader({ onUploadComplete }: { onUploadComplete: (files: File[], text: string) => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);



    const handleFiles = async (newFiles: File[]) => {
        const validFiles = newFiles.slice(0, 5); // Max 5
        setFiles(validFiles);
        setIsUploading(true);

        const formData = new FormData();
        validFiles.forEach(f => formData.append("files", f));

        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error("Authentication required");

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/course/upload-documents`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Upload failed");
            }

            const data = await res.json();
            onUploadComplete(validFiles, data.text);

        } catch (error: unknown) {
            console.error("Upload Error:", error);
            // Show error to user? For now just log and potentially clear state
            alert(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            setFiles([]); // Reset files
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(Array.from(e.dataTransfer.files));
            }}
            className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all",
                isDragging ? "border-teal-500 bg-teal-50" : "border-slate-300 hover:border-teal-400"
            )}
        >
            {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                    <p className="text-sm text-slate-500">Processing documents...</p>
                </div>
            ) : (
                <>
                    <Paperclip className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">Drag & drop files here</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT (Max 10MB)</p>
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        id="file-upload"
                        onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                    />
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => document.getElementById('file-upload')?.click()}>
                        Browse Files
                    </Button>
                </>
            )}
        </div>
    );
}
