import React, { useState, useEffect } from 'react';
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

                const res = await fetch("http://127.0.0.1:8000/get-signed-url", {
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

    // 1. CHART RENDERER
    if (visual_type === 'chart' && chart_data) {
        return (
            <div
                className="w-full h-full relative overflow-hidden flex flex-col items-center justify-start p-4 border-2 border-slate-200 rounded-lg"
                style={{ backgroundColor: slide.background_color || '#f8fafc' }}
            >
                <h3
                    className="text-lg font-bold mb-2 text-center sticky top-0 py-1 w-full z-10 truncate px-4"
                    style={{
                        color: slide.text_color || '#1e293b',
                        backgroundColor: slide.background_color || '#f8fafc'
                    }}
                >
                    {(() => {
                        const rawText = slide.visual_text || chart_data.title || "";
                        // Extract first line and remove markdown headers (#, ##, etc.)
                        return rawText.split('\n')[0].replace(/^#+\s*/, '').trim();
                    })()}
                </h3>

                {/* Dynamic Chart Layouts - COMPACT MODE */}
                <div className="w-full max-w-lg flex-1 min-h-0 flex flex-col justify-center">
                    {/* List Type */}
                    {chart_data.type === 'list' && (
                        <div className="space-y-2">
                            {chart_data.items?.map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 bg-white p-2 rounded-md shadow-sm border border-slate-100">
                                    <div className={`p-1.5 rounded-full bg-${item.color_intent || 'blue'}-100`}>
                                        <div className={`text-${item.color_intent || 'blue'}-600`}>
                                            {React.createElement(IconMap[item.icon] || IconMap.default, { size: 16 })}
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-slate-700 text-xs truncate">{item.label}</div>
                                        {item.description && <div className="text-[10px] text-slate-500 truncate">{item.description}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Process Type (Step by Step) */}
                    {chart_data.type === 'process' && (
                        <div className="flex flex-col gap-1.5">
                            {chart_data.items?.map((item: any, i: number) => (
                                <div key={i} className="relative pl-4 pb-2 border-l-2 border-slate-200 last:border-0 last:pb-0">
                                    <div className="absolute -left-[9px] top-0 w-3 h-3 rounded-full bg-teal-500 border-2 border-white shadow-sm" />
                                    <div className="bg-white p-1.5 rounded border shadow-sm ml-2">
                                        <div className="font-bold text-xs text-slate-700 truncate">{item.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Fallback Grid */}
                    {!['list', 'process'].includes(chart_data.type) && (
                        <div className="grid grid-cols-2 gap-2">
                            {chart_data.items?.map((item: any, i: number) => (
                                <div key={i} className="bg-white p-2 rounded-lg shadow-sm border text-center">
                                    <div className="mx-auto w-8 h-8 mb-1 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                        {React.createElement(IconMap[item.icon] || IconMap.default, { size: 16 })}
                                    </div>
                                    <div className="font-bold text-xs text-slate-800 leading-tight">{item.label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Badge className="absolute top-2 right-2 opacity-50" variant="outline">Chart Preview</Badge>
            </div>
        );
    }

    // 2. KINETIC TEXT RENDERER
    if (visual_type === 'kinetic_text') {
        return (
            <div
                className="w-full h-full flex flex-col justify-center items-start p-16 rounded-lg"
                style={{ backgroundColor: slide.background_color || '#0f172a' }}
            >
                <div className="space-y-6 w-full">
                    {(slide.visual_text || "Motion Text").split('\n').map((line: string, i: number) => (
                        <h1
                            key={i}
                            className="text-3xl font-black tracking-tight uppercase text-left leading-tight"
                            style={{ color: slide.text_color || '#ffffff' }}
                        >
                            {line}
                        </h1>
                    ))}
                </div>
            </div>
        )
    }

    // 3. TITLE CARD RENDERER
    if (visual_type === 'title_card') {
        const isThankYou = slide.text?.toLowerCase().includes("thank you");
        const defaultBg = isThankYou ? '#1e293b' : '#0d9488'; // slate-800 or teal-600

        return (
            <div
                className="w-full h-full flex flex-col items-center justify-center p-12 text-center rounded-lg"
                style={{
                    backgroundColor: slide.background_color || defaultBg,
                    color: slide.text_color || '#ffffff'
                }}
            >
                <h1 className="text-5xl font-bold tracking-tight mb-4">
                    {slide.visual_text || "Title Card"}
                </h1>
                <div
                    className="h-1 w-20 rounded-full mx-auto"
                    style={{ backgroundColor: slide.text_color ? `${slide.text_color}4D` : 'rgba(255,255,255,0.3)' }}
                />
                <Badge className="absolute top-2 right-2 bg-white/20 hover:bg-white/30 text-white border-0">
                    Title Card
                </Badge>
            </div>
        )
    }

    // 4. HYBRID RENDERER (Text Left 50%, Image Right 50%)
    if (visual_type === 'hybrid') {
        return (
            <div className="w-full h-full flex flex-row bg-slate-900 overflow-hidden rounded-lg">
                {/* Left: Text */}
                <div
                    className="w-1/2 h-full flex flex-col justify-center p-6 border-r border-slate-800"
                    style={{ backgroundColor: slide.background_color || '#0f172a' }}
                >
                    <div className="text-left space-y-4">
                        {(slide.visual_text || slide.text || "Hybrid Slide Text").split('\n').map((line: string, i: number) => (
                            <h2
                                key={i}
                                className="text-xl font-bold leading-tight"
                                style={{ color: slide.text_color || '#ffffff' }}
                            >
                                {line}
                            </h2>
                        ))}
                    </div>
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

                <Badge className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white border-0">
                    Hybrid
                </Badge>
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
                    <pre className="whitespace-pre-wrap font-sans text-sm font-semibold">
                        {slide.visual_text}
                    </pre>
                </div>
            )}

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge className="bg-black/50 hover:bg-black/70 text-white border-0">
                    {visual_type}
                </Badge>
            </div>
        </div>
    );
}
