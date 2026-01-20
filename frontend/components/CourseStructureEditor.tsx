"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, Save, Image as ImageIcon, FileText, MonitorPlay } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

interface Slide {
    slide_number: number;
    text: string;
    visual_text: string;
    layout: "split" | "text_only" | "image_only";
    prompt: string;
    duration: number;
}

interface CourseStructureEditorProps {
    courseId: string;
    initialSlides: Slide[];
    onFinalize: () => void;
}

export default function CourseStructureEditor({ courseId, initialSlides, onFinalize }: CourseStructureEditorProps) {
    const router = useRouter();
    // const { toast } = useToast();
    const [slides, setSlides] = useState<Slide[]>(initialSlides);
    const [isSaving, setIsSaving] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

    const handleSlideChange = (index: number, field: keyof Slide, value: any) => {
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], [field]: value };
        setSlides(newSlides);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("courses")
                .update({ slide_data: slides })
                .eq("id", courseId);

            if (error) throw error;
            // toast({ title: "Saved", description: "Changes saved successfully." });
            alert("Changes saved successfully.");
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save changes.");
            // toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalize = async () => {
        setIsFinalizing(true);
        try {
            // First save latest changes
            const supabase = createClient();
            await supabase.from("courses").update({ slide_data: slides }).eq("id", courseId);

            // Call finalize endpoint
            const res = await fetch("http://127.0.0.1:8000/finalize-course", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({ slide_data: slides, course_id: courseId }), // course_id via query or body? Endpoint expects query but body has slide_data. 
            });
            // Endpoint def: async def finalize_course(course_id: str...)
            // So URL should be /finalize-course?course_id=... or /finalize-course/{id} if I changed it?
            // backend: @app.post("/finalize-course") async def finalize_course(course_id: str, ...)
            // FastAPI usually expects query param for simple types if not in path.
            // Let's rely on query param.

            // Wait, I defined it as `finalize_course(course_id: str, ...)` so it expects query string.
            // Let's correct the fetch.

            if (!res.ok) throw new Error("Failed to finalize");

            // toast({ title: "Rendering Started", description: "Your video is being generated." });
            onFinalize(); // Callback to redirect or update state
        } catch (error) {
            console.error("Finalize error:", error);
            alert("Failed to start rendering.");
            setIsFinalizing(false);
        }
    };

    // Correction for fetch above
    const finalizeUrl = `/finalize-course?course_id=${courseId}`;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Review Course Structure</h2>
                    <p className="text-muted-foreground">Edit script, visuals, and timing before rendering.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Draft
                    </Button>
                    <Button onClick={() => {
                        // We need to call the fetch with the correct URL
                        setIsFinalizing(true);
                        const supabase = createClient();
                        supabase.auth.getSession().then(({ data: { session } }) => {
                            fetch(`http://127.0.0.1:8000/finalize-course?course_id=${courseId}`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${session?.access_token}`
                                },
                                body: JSON.stringify({ slide_data: slides })
                            }).then(res => {
                                if (!res.ok) throw new Error("Failed");
                                alert("Rendering Started: Your video is being generated.");
                                onFinalize();
                            }).catch(err => {
                                console.error(err);
                                alert("Failed to start render");
                                setIsFinalizing(false);
                            })
                        });
                    }} disabled={isFinalizing}>
                        {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                        Generate Video
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                {slides.map((slide, index) => (
                    <Card key={index} className="overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-3">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                <Badge variant="outline" className="bg-white">Slide {slide.slide_number}</Badge>
                                <span className="text-slate-500 text-sm font-normal">
                                    {(slide.duration / 1000).toFixed(1)}s
                                </span>
                            </CardTitle>
                            <Badge variant="secondary" className="capitalize">{slide.layout.replace("_", " ")}</Badge>
                        </CardHeader>
                        <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                            {/* Visuals Column */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <MonitorPlay className="h-4 w-4 text-blue-500" />
                                        On-Screen Text (Markdown)
                                    </label>
                                    <Textarea
                                        value={slide.visual_text}
                                        onChange={(e) => handleSlideChange(index, "visual_text", e.target.value)}
                                        className="font-mono text-sm min-h-[100px]"
                                        placeholder="# Header&#10;- Bullet point"
                                    />
                                    <p className="text-xs text-muted-foreground">Appears on slide. Use # for headers, - for bullets.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4 text-purple-500" />
                                        Visual Description (AI Prompt)
                                    </label>
                                    <Textarea
                                        value={slide.prompt}
                                        onChange={(e) => handleSlideChange(index, "prompt", e.target.value)}
                                        className="text-sm min-h-[100px]"
                                        placeholder="Describe the image..."
                                    />
                                    <p className="text-xs text-muted-foreground">Instructions for the AI image generator.</p>
                                </div>
                            </div>

                            {/* Audio Column */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-emerald-500" />
                                        Narration Script
                                    </label>
                                    <Textarea
                                        value={slide.text}
                                        onChange={(e) => handleSlideChange(index, "text", e.target.value)}
                                        className="text-sm min-h-[200px] leading-relaxed"
                                        placeholder="Spoken narration..."
                                    />
                                    <p className="text-xs text-muted-foreground">Word count: {slide.text.split(" ").length}. Affects duration.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
