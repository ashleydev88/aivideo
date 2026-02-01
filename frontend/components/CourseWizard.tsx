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
    Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Types corresponding to backend
type CoursePurpose = "onboarding" | "compliance_training" | "leadership_development" | "business_case" | "custom";
type TargetAudience = "employees" | "line_managers" | "senior_leadership" | "executives" | "mixed";

interface WizardState {
    purpose: CoursePurpose | null;
    audience: TargetAudience | null;
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
}

const STEPS = [
    "WELCOME",
    "PURPOSE",
    "AUDIENCE",
    "DOCUMENTS_CHECK",
    "DOCUMENTS_UPLOAD",
    "DURATION",
    "STYLE",
    "TITLE",
    "REVIEW"
] as const;

type Step = typeof STEPS[number];

export default function CourseWizard({ onComplete, isLoading = false }: CourseWizardProps) {
    // --- State ---
    const [currentStep, setCurrentStep] = useState<Step>("WELCOME");
    const [history, setHistory] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    const [state, setState] = useState<WizardState>({
        purpose: null,
        audience: null,
        hasDocuments: null,
        documents: [],
        documentText: "",
        duration: null,
        style: "Minimalist Vector",
        accentColor: "#14b8a6",
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
                addBotMessage("I can help you build a high-impact video course. To get started, what is the primary purpose of video course?", "PURPOSE");
                setCurrentStep("PURPOSE");
            }, 800);
        }
    }, []);

    // --- Helpers ---

    const addBotMessage = (content: string, step?: string) => {
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
        }, 600);
    };

    const addUserMessage = (content: string) => {
        setHistory(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            role: "user",
            content
        }]);
    };

    // --- Handlers ---

    const handlePurposeSelect = (purpose: CoursePurpose, label: string) => {
        addUserMessage(label);
        setState(prev => ({ ...prev, purpose }));
        setCurrentStep("AUDIENCE");
        addBotMessage("Got it. And who is the target audience for this course?", "AUDIENCE");
    };

    const handleAudienceSelect = (audience: TargetAudience, label: string) => {
        addUserMessage(label);
        setState(prev => ({ ...prev, audience }));
        setCurrentStep("DOCUMENTS_CHECK");
        addBotMessage("Do you have existing source documents (PDFs, Policies) you'd like me to base the content on?", "DOCUMENTS_CHECK");
    };

    const handleDocumentCheck = (hasDocs: boolean) => {
        addUserMessage(hasDocs ? "Yes, I have documents" : "No, generate from scratch");
        setState(prev => ({ ...prev, hasDocuments: hasDocs }));

        if (hasDocs) {
            setCurrentStep("DOCUMENTS_UPLOAD");
            addBotMessage("Great. Please upload your documents (PDF, DOCX, TXT). Max 5 files, 10MB each.", "DOCUMENTS_UPLOAD");
        } else {
            setCurrentStep("DURATION");
            addBotMessage("No problem. I can generate best-practice content for you. How long should the video course be?", "DURATION");
        }
    };

    const handleDurationSelect = (minutes: number) => {
        addUserMessage(`${minutes} minutes`);
        setState(prev => ({ ...prev, duration: minutes }));
        setCurrentStep("STYLE");
        addBotMessage("Perfect. Now, choose a visual style for your video.", "STYLE");
    };

    const handleStyleSelect = (style: string, color: string, colorName: string) => {
        addUserMessage(`${style} (${colorName})`);
        setState(prev => ({ ...prev, style, accentColor: color, colorName }));
        setCurrentStep("TITLE");
        addBotMessage("Almost done! What should we name this course?", "TITLE");
    };

    const handleTitleSubmit = (title: string) => {
        if (!title.trim()) return;
        addUserMessage(title);
        const finalState = { ...state, title };
        setState(finalState);
        setCurrentStep("REVIEW");
        addBotMessage("Here's what we're building. Ready to generate the plan?", "REVIEW");
    };

    // --- Renderers ---

    const renderOptions = () => {
        if (isTyping) return null;

        switch (currentStep) {
            case "PURPOSE":
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <OptionCard
                            icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            title="Onboarding"
                            desc="Welcome new hires with culture & basics"
                            onClick={() => handlePurposeSelect("onboarding", "Onboarding")}
                        />
                        <OptionCard
                            icon={<Briefcase className="w-5 h-5 text-blue-500" />}
                            title="Compliance Training"
                            desc="Mandatory policies, safety, & regulation"
                            onClick={() => handlePurposeSelect("compliance_training", "Compliance Training")}
                        />
                        <OptionCard
                            icon={<Target className="w-5 h-5 text-purple-500" />}
                            title="Leadership Development"
                            desc="Soft skills, management & strategy"
                            onClick={() => handlePurposeSelect("leadership_development", "Leadership Development")}
                        />
                        <OptionCard
                            icon={<FileText className="w-5 h-5 text-orange-500" />}
                            title="Business Case"
                            desc="Proposals, pitches & project updates"
                            onClick={() => handlePurposeSelect("business_case", "Business Case")}
                        />
                    </div>
                );

            case "AUDIENCE":
                return (
                    <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-4">
                        {[
                            { id: "employees", label: "All Employees" },
                            { id: "line_managers", label: "Line Managers" },
                            { id: "senior_leadership", label: "Senior Leadership" },
                            { id: "executives", label: "Executives" },
                            { id: "mixed", label: "Mixed Audience" }
                        ].map(opt => (
                            <Button
                                key={opt.id}
                                variant="outline"
                                onClick={() => handleAudienceSelect(opt.id as TargetAudience, opt.label)}
                                className="rounded-full hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50"
                            >
                                {opt.label}
                            </Button>
                        ))}
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
                                setCurrentStep("DURATION");
                                addBotMessage(`Received ${files.length} document(s). How long should the video be?`, "DURATION");
                            }}
                        />
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
                                <span className="text-slate-500">Purpose:</span>
                                <span className="font-medium capitalize">{state.purpose?.replace('_', ' ')}</span>
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
                                <span className="text-slate-500">Documents:</span>
                                <span className="font-medium">{state.hasDocuments ? `${state.documents.length} files` : "None"}</span>
                            </div>
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
