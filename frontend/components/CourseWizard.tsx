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
    "DURATION",
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
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

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
        setState(prev => ({ ...prev, topic }));
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
        setCurrentStep("DURATION");
        addBotMessage("Thanks. Now, how long should this video course be?", "DURATION");
    };

    const handleDurationSelect = (minutes: number) => {
        addUserMessage(`${minutes} minutes`);
        setState(prev => ({ ...prev, duration: minutes }));
        setCurrentStep("STYLE");
        addBotMessage("Perfect. Choose a visual style for the video.", "STYLE");
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
        addBotMessage("Here's the plan. Ready to generate the course?", "REVIEW");
    };

    // --- Renderers ---

    const renderOptions = () => {
        if (isTyping) return null;

        switch (currentStep) {
            case "TOPIC":
                return (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-4">
                        <input
                            type="text"
                            className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                            placeholder="e.g., Cyber Security Awareness"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleTopicSubmit(e.currentTarget.value);
                            }}
                            autoFocus
                        />
                        <Button onClick={(e) => {
                            const input = e.currentTarget.previousSibling as HTMLInputElement;
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

            case "DURATION":
                return (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-4">
                        {[3, 5, 10, 15, 20].map(min => (
                            <div
                                key={min}
                                onClick={() => handleDurationSelect(min)}
                                className="cursor-pointer border rounded-xl p-4 hover:border-teal-500 hover:bg-teal-50 transition-all text-center"
                            >
                                <Clock className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                                <div className="font-semibold">{min} Mins</div>
                                <div className="text-xs text-slate-500">
                                    {min <= 5 ? "~5-15 slides" : min <= 10 ? "~25-35 slides" : "~40+ slides"}
                                </div>
                            </div>
                        ))}
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
                        <input
                            type="text"
                            className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none"
                            placeholder="e.g., Q3 Safety Compliance"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleTitleSubmit(e.currentTarget.value);
                            }}
                        />
                        <Button onClick={(e) => {
                            const input = e.currentTarget.previousSibling as HTMLInputElement;
                            handleTitleSubmit(input.value);
                        }}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                );

            case "REVIEW":
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
                                <span className="font-medium">{state.duration} mins</span>
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
                        <Button
                            className="w-full bg-teal-600 hover:bg-teal-700 text-lg py-6"
                            onClick={() => onComplete(state)}
                            disabled={isLoading}
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

        } catch (error: any) {
            console.error("Upload Error:", error);
            // Show error to user? For now just log and potentially clear state
            alert(`Upload failed: ${error.message}`);
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
