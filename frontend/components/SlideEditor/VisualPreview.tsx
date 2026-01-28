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
        // Helper for colors
        const accentColor = slide.accent_color;
        const getColor = (intent: string | undefined): string => {
            const colors: Record<string, string> = {
                'danger': '#ef4444',
                'success': '#22c55e',
                'warning': '#f59e0b',
                'accent': '#8b5cf6',
                'primary': '#3b82f6',
                'secondary': '#64748b'
            };
            return colors[intent || ''] || accentColor || '#14b8a6';
        };

        const ChartIcon = ({ name, color, size = 20 }: any) => {
            const Icon = IconMap[name] || IconMap.default;
            return <Icon size={size} color={color} />;
        };

        return (
            <div
                className="w-full h-full relative overflow-hidden flex flex-col items-center justify-start p-4 border-2 border-slate-200 rounded-lg"
                style={{ backgroundColor: slide.background_color || '#f8fafc' }}
            >
                <h3
                    className="text-lg font-black mb-4 text-center sticky top-0 py-1 w-full z-10 truncate px-4"
                    style={{
                        color: slide.text_color || '#1e293b',
                        backgroundColor: slide.background_color || '#f8fafc'
                    }}
                >
                    {slide.visual_text || chart_data.title || ""}
                </h3>

                <div className="w-full flex-1 min-h-0 flex items-center justify-center overflow-y-auto">

                    {/* LIST */}
                    {chart_data.type === 'list' && (
                        <div className="w-full max-w-xl space-y-2 px-4">
                            {chart_data.items?.map((item: any, i: number) => {
                                const color = getColor(item.color_intent);
                                return (
                                    <div key={i} className="flex items-center gap-3 bg-white p-2.5 rounded-lg shadow-sm border-l-4" style={{ borderLeftColor: color }}>
                                        <div className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                                            {i + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-slate-700 text-sm truncate">{item.label}</div>
                                            {item.description && <div className="text-xs text-slate-500 truncate">{item.description}</div>}
                                        </div>
                                        <ChartIcon name={item.icon} color={color} size={16} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* PROCESS */}
                    {chart_data.type === 'process' && (
                        <div className="w-full px-4 flex flex-row items-center justify-center gap-2">
                            {chart_data.items?.map((item: any, i: number) => {
                                const color = getColor(item.color_intent);
                                return (
                                    <React.Fragment key={i}>
                                        {i > 0 && <div className="text-slate-300 flex-shrink-0">→</div>}
                                        <div
                                            className="flex-1 min-w-0 bg-white p-2 rounded-xl shadow-sm border-b-4 flex flex-col items-center text-center"
                                            style={{ borderColor: color }}
                                        >
                                            <div className="mb-1 p-1 rounded-full bg-slate-50">
                                                <ChartIcon name={item.icon || 'box'} color={color} size={18} />
                                            </div>
                                            <div className="font-bold text-slate-800 text-[10px] sm:text-xs leading-tight mb-0.5 w-full truncate">{item.label}</div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}

                    {/* STATISTICS */}
                    {chart_data.type === 'statistic' && (
                        <div className="flex flex-wrap justify-center gap-3 w-full px-4">
                            {chart_data.items?.map((item: any, i: number) => {
                                const color = getColor(item.color_intent);
                                return (
                                    <div
                                        key={i}
                                        className="bg-white/80 p-3 rounded-2xl shadow-sm text-center flex-1 min-w-[100px] max-w-[160px] border-t-4"
                                        style={{ borderTopColor: color }}
                                    >
                                        <div className="text-2xl sm:text-3xl font-black mb-1 tracking-tighter" style={{ color }}>
                                            {item.label}
                                        </div>
                                        <div className="text-[10px] sm:text-xs font-bold text-slate-700 leading-tight line-clamp-2">
                                            {item.description}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* COMPARISON */}
                    {chart_data.type === 'comparison' && (
                        <div className="flex flex-row items-stretch justify-center gap-2 w-full px-6">
                            {chart_data.items?.slice(0, 2).map((item: any, i: number) => {
                                const color = getColor(item.color_intent) || (i === 0 ? '#3b82f6' : '#ef4444');
                                return (
                                    <React.Fragment key={i}>
                                        {i === 1 && (
                                            <div className="flex items-center justify-center -mx-3 z-10">
                                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-md border-2 border-white">
                                                    VS
                                                </div>
                                            </div>
                                        )}
                                        <div
                                            className="flex-1 bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center text-center border-t-4 min-w-0"
                                            style={{ borderTopColor: color }}
                                        >
                                            <div className="mb-2">
                                                <ChartIcon name={item.icon || (i === 0 ? 'check-circle' : 'x-circle')} color={color} size={24} />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-800 mb-1 w-full truncate">{item.label}</h3>
                                            <p className="text-[10px] text-slate-500 font-medium leading-tight line-clamp-3">{item.description}</p>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}

                    {/* GRID */}
                    {['grid'].includes(chart_data.type) && (
                        <div className="grid grid-cols-2 gap-3 w-full px-6">
                            {chart_data.items?.map((item: any, i: number) => {
                                const color = getColor(item.color_intent);
                                return (
                                    <div
                                        key={i}
                                        className="bg-white p-3 rounded-xl shadow-sm flex items-start gap-3 border-l-4 overflow-hidden"
                                        style={{ borderLeftColor: color }}
                                    >
                                        <div className="mt-0.5 flex-shrink-0">
                                            <ChartIcon name={item.icon || 'layers'} color={color} size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-slate-800 text-xs mb-0.5 truncate">{item.label}</div>
                                            <div className="text-[10px] text-slate-500 leading-tight line-clamp-2">{item.description}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* PYRAMID */}
                    {chart_data.type === 'pyramid' && (
                        <div className="flex flex-col items-center justify-center w-full px-4 gap-1.5">
                            {chart_data.items?.map((item: any, i: number) => {
                                const width = 100 - (i * 15);
                                const color = getColor(item.color_intent);
                                return (
                                    <div
                                        key={i}
                                        className="h-10 flex items-center justify-center bg-white shadow-sm rounded-lg border-l-4 overflow-hidden relative"
                                        style={{ width: `${Math.max(width, 40)}%`, borderLeftColor: color }}
                                    >
                                        <div className="px-2 text-center min-w-0 w-full">
                                            <div className="text-xs font-bold text-slate-800 truncate">{item.label}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* CYCLE */}
                    {chart_data.type === 'cycle' && (
                        <div className="relative w-64 h-64 flex items-center justify-center flex-shrink-0 scale-75 sm:scale-90">
                            <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-200" />
                            {chart_data.items?.map((item: any, i: number) => {
                                const count = chart_data.items.length;
                                const angle = (i / count) * 2 * Math.PI - (Math.PI / 2); // Start at top
                                const radius = 100; // px
                                const x = Math.cos(angle) * radius;
                                const y = Math.sin(angle) * radius;
                                const color = getColor(item.color_intent);

                                return (
                                    <div
                                        key={i}
                                        className="absolute bg-white p-2 rounded-lg shadow-sm border text-center w-24 flex flex-col items-center"
                                        style={{
                                            left: `calc(50% + ${x}px)`,
                                            top: `calc(50% + ${y}px)`,
                                            transform: 'translate(-50%, -50%)',
                                            borderColor: color
                                        }}
                                    >
                                        <ChartIcon name={item.icon || 'refresh-cw'} color={color} size={16} />
                                        <span className="mt-1 font-bold text-slate-800 text-[10px] leading-tight line-clamp-2">{item.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
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
                    {(slide.visual_text || slide.text || "Motion Text").split('\n').map((line: string, i: number) => (
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
                    {slide.visual_text || slide.text || "Title Card"}
                </h1>
                <div
                    className="h-1 w-20 rounded-full mx-auto"
                    style={{ backgroundColor: slide.text_color ? `${slide.text_color}4D` : (slide.accent_color || 'rgba(255,255,255,0.3)') }}
                />

            </div>
        )
    }

    // 4. HYBRID RENDERER (Text Left 50%, Image Right 50%)
    // Also catch "image" types that have text, as we don't want the overlay layout
    const isHybrid = visual_type === 'hybrid' ||
        ((visual_type === 'image' || !visual_type) && !!slide.visual_text);

    if (isHybrid) {
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


        </div>
    );
}
