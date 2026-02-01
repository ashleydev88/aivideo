import React, { useState, useEffect } from 'react';
import parse from 'html-react-parser';
import Image from 'next/image';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
    Activity,
    Box,
    Layers,
    Shield,
    Target,
    TrendingUp,
    User,
    Zap,
    RefreshCcw,
    CheckCircle2
} from "lucide-react";
import { MotionGraphPreview } from './MotionGraphPreview';
import { AutoFitText } from './AutoFitText';

interface VisualPreviewProps {
    slide: any; // We'll define a stricter type later or reuse the one from Editor
    aspectRatio?: string;
}

// Icon mapper for charts
const IconMap: Record<string, any> = {
    "activity": Activity,
    "box": Box,
    "layers": Layers,
    "shield": Shield,
    "target": Target,
    "trending-up": TrendingUp,
    "user": User,
    "zap": Zap,
    "refresh-cw": RefreshCcw,
    "default": Box
};

const ScaleContainer = ({ children }: { children: React.ReactNode }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                // Scale 1920px content to fit container width
                setScale(width / 1920);
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-100 flex items-center justify-center">
            <div
                style={{
                    width: 1920,
                    height: 1080,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    flexShrink: 0,
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default function VisualPreview({ slide, aspectRatio = "video" }: VisualPreviewProps) {
    const { visual_type, layout, image, chart_data } = slide;
    const [resolvedImage, setResolvedImage] = useState<string | null>(null);

    // Resolve Image URL (Path -> Signed URL)
    useEffect(() => {
        let isMounted = true;

        const resolveUrl = async () => {
            if (!image) {
                if (isMounted) setResolvedImage(null);
                return;
            }

            if (image.startsWith("http") || image.startsWith("blob:")) {
                if (isMounted) setResolvedImage(image);
                return;
            }

            // It's a path, fetch signed URL
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();

                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
                const res = await fetch(`${API_BASE_URL}/api/course/get-signed-url`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({ path: image })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) setResolvedImage(data.signed_url);
                } else {
                    console.error("Failed to sign image URL");
                }
            } catch (e) {
                console.error("Error signing image URL:", e);
            }
        };

        resolveUrl();

        return () => { isMounted = false; };
    }, [image]);


    // Fallback if no visual yet
    if (!image && !chart_data && visual_type !== 'kinetic_text' && visual_type !== 'title_card') {
        return (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                Drafting Visual...
            </div>
        );
    }

    // 1. CHART RENDERER (MotionGraph)
    if (visual_type === 'chart' && chart_data) {
        return (
            <ScaleContainer>
                <MotionGraphPreview
                    data={chart_data}
                    accentColor={slide.accent_color}
                    backgroundColor={slide.background_color}
                    textColor={slide.text_color}
                />
            </ScaleContainer>
        );
    }

    // 2. KINETIC TEXT RENDERER
    if (visual_type === 'kinetic_text') {
        const textContent = slide.visual_text || slide.text || "";
        const isHtml = /<[a-z][\s\S]*>/i.test(textContent);

        return (
            <div
                className="slide-preview-content w-full h-full p-8 rounded-lg overflow-hidden"
                style={{ backgroundColor: slide.background_color || '#0f172a' }}
            >
                <AutoFitText className="items-center justify-center origin-center">
                    {isHtml ? (
                        <div
                            className="prose prose-xl dark:prose-invert max-w-none text-center"
                            style={{ color: slide.text_color || '#ffffff' }}
                        >
                            <style>{`
                                .slide-preview-content h1 { font-weight: 800; line-height: 1.1; margin-bottom: 0.5em; }
                                .slide-preview-content h2 { font-weight: 700; margin-bottom: 0.5em; }
                                .slide-preview-content p { margin-bottom: 0.5em; }
                                .slide-preview-content ul { list-style-type: disc; text-align: left; padding-left: 1.5em; }
                                .slide-preview-content li { margin-bottom: 0.5em; }
                                .slide-preview-content strong { color: ${slide.accent_color || '#14b8a6'}; }
                             `}</style>
                            {parse(textContent)}
                        </div>
                    ) : (
                        <div className="space-y-6 w-full text-center">
                            {textContent.split('\n').map((line: string, i: number) => (
                                <h1
                                    key={i}
                                    className="font-black tracking-tight uppercase leading-tight text-5xl"
                                    style={{
                                        color: slide.text_color || '#ffffff',
                                    }}
                                >
                                    {line}
                                </h1>
                            ))}
                        </div>
                    )}
                </AutoFitText>
            </div>
        )
    }

    // 3. TITLE CARD RENDERER
    if (visual_type === 'title_card') {
        const textContent = slide.visual_text || slide.text || "";
        const isThankYou = slide.text?.toLowerCase().includes("thank you");
        const defaultBg = isThankYou ? '#1e293b' : '#0d9488'; // slate-800 or teal-600
        const isHtml = /<[a-z][\s\S]*>/i.test(textContent);

        return (
            <div
                className="slide-preview-content w-full h-full flex flex-col items-center justify-center p-12 text-center rounded-lg overflow-hidden"
                style={{
                    backgroundColor: slide.background_color || defaultBg,
                    color: slide.text_color || '#ffffff'
                }}
            >
                <AutoFitText className="items-center justify-center origin-center">
                    {isHtml ? (
                        <div className="prose prose-2xl dark:prose-invert max-w-none">
                            <style>{`
                                .slide-preview-content h1 { font-weight: 800; line-height: 1.1; margin-bottom: 0.5em; }
                                .slide-preview-content p { opacity: 0.9; }
                                .slide-preview-content strong { color: rgba(255,255,255,0.9); }
                             `}</style>
                            {parse(textContent)}
                        </div>
                    ) : (
                        <>
                            <h1
                                className="font-bold tracking-tight mb-4 text-6xl"
                            >
                                {textContent || "Title Card"}
                            </h1>
                            <div
                                className="h-1 w-20 rounded-full mx-auto"
                                style={{ backgroundColor: slide.text_color ? `${slide.text_color}4D` : (slide.accent_color || 'rgba(255,255,255,0.3)') }}
                            />
                        </>
                    )}
                </AutoFitText>

            </div>
        )
    }

    // 4. HYBRID RENDERER (Text Left 50%, Image Right 50%)
    const isHybrid = visual_type === 'hybrid' ||
        ((visual_type === 'image' || !visual_type) && !!slide.visual_text);

    if (isHybrid) {
        const textContent = slide.visual_text || slide.text || "";
        const isHtml = /<[a-z][\s\S]*>/i.test(textContent);

        return (
            <div className="w-full h-full flex flex-row bg-slate-900 overflow-hidden rounded-lg">
                {/* Left: Text */}
                <div
                    className="slide-preview-content w-1/2 h-full flex flex-col p-6 border-r border-slate-800 overflow-hidden"
                    style={{ backgroundColor: slide.background_color || '#0f172a' }}
                >
                    <AutoFitText className="items-start justify-center origin-left">
                        {isHtml ? (
                            <div className="prose prose-lg dark:prose-invert max-w-none text-left" style={{ color: slide.text_color || '#ffffff' }}>
                                <style>{`
                                    .slide-preview-content h1 { font-weight: 800; margin-bottom: 0.4em; line-height: 1.1; }
                                    .slide-preview-content h2 { font-weight: 700; margin-bottom: 0.4em; }
                                    .slide-preview-content p { margin-bottom: 0.5em; line-height: 1.4; }
                                    .slide-preview-content ul { list-style-type: disc; padding-left: 1.2em; }
                                    .slide-preview-content li { margin-bottom: 0.3em; }
                                    .slide-preview-content strong { color: ${slide.accent_color || '#14b8a6'}; }
                                 `}</style>
                                {parse(textContent)}
                            </div>
                        ) : (
                            <div className="text-left space-y-4">
                                {(textContent || "Hybrid Slide Text").split('\n').map((line: string, i: number) => (
                                    <h2
                                        key={i}
                                        className="font-bold leading-tight"
                                        style={{
                                            color: slide.text_color || '#ffffff',
                                            fontSize: `2.5rem`
                                        }}
                                    >
                                        {line}
                                    </h2>
                                ))}
                            </div>
                        )}
                    </AutoFitText>
                </div>

                {/* Right: Image */}
                <div className="w-1/2 h-full relative bg-slate-100">
                    {resolvedImage ? (
                        <Image
                            src={resolvedImage}
                            alt={slide.prompt || "Slide Visual"}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 p-4 text-center">
                            {image ? <div className="flex flex-col items-center gap-2"><RefreshCcw className="animate-spin h-4 w-4" /> <span className="text-xs">Loading Visual...</span></div> : "No Image"}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // 5. IMAGE RENDERER (Default)
    return (
        <div className="w-full h-full relative bg-slate-100 rounded-lg overflow-hidden group">
            {resolvedImage ? (
                <Image
                    src={resolvedImage}
                    alt={slide.prompt || "Slide Visual"}
                    fill
                    className="object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                    {image ? <div className="flex items-center gap-2"><RefreshCcw className="animate-spin h-4 w-4" /> Loading Visual...</div> : "No Image"}
                </div>
            )}

            {/* Overlay Text Preview */}
            {slide.visual_text && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm p-4 rounded-md text-white">
                    <div className="font-mono text-xs opacity-70 mb-1">ON-SCREEN TEXT</div>
                    {/<[a-z][\s\S]*>/i.test(slide.visual_text) ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            {parse(slide.visual_text)}
                        </div>
                    ) : (
                        <pre className="whitespace-pre-wrap font-sans text-sm font-semibold">
                            {slide.visual_text}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}


