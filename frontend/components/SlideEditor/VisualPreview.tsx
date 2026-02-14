import React, { useState, useEffect, useRef } from 'react';
import parse from 'html-react-parser';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { ChromePicker } from 'react-color';
import { createClient } from "@/lib/supabase/client";
import {
    RefreshCcw,
    Palette
} from "lucide-react";
import { cn, isLightColor } from "@/lib/utils";
import { MotionGraphPreview } from './MotionGraphPreview';
import { AutoFitText } from './AutoFitText';
import RichTextEditor from './RichTextEditor';
import { MotionGraph, MotionNode } from '@/lib/types/MotionGraph';

interface VisualPreviewProps {
    slide: SlidePreviewData;
    aspectRatio?: string;
    onChartUpdate?: (newData: MotionGraph) => void;
    onTextChange?: (newText: string) => void;
    onBackgroundChange?: (newColor: string) => void;
    onSlideFieldChange?: (field: keyof SlidePreviewData, value: unknown) => void;
    narrationTokens?: Array<{ index: number; word: string }>;
    timingLinks?: Array<{ sourceId: string; tokenIndex: number }>;
    onTextTimingLinkAdd?: (payload: { sourceId: string; sourceType: "word" | "paragraph" | "heading" | "node" | "edge"; sourceText: string; tokenIndex: number }) => void;
    onTextTimingLinkRemove?: (sourceId: string) => void;
}

interface SlideLayoutData {
    left_label?: string;
    left_text?: string;
    left_image?: string;
    right_label?: string;
    right_text?: string;
    right_image?: string;
    stat_label?: string;
    stat_value?: string;
    verbatim_quote?: string;
    source_reference?: string;
    context_note?: string;
    kicker?: string;
    [key: string]: unknown;
}

interface SlidePreviewData {
    visual_type?: string;
    layout?: string;
    image?: string;
    chart_data?: MotionGraph;
    visual_text?: string;
    text?: string;
    prompt?: string;
    background_color?: string;
    text_color?: string;
    accent_color?: string;
    layout_data?: SlideLayoutData;
    is_assessment?: boolean;
}

interface LogoCrop {
    zoom?: number;
}

interface BackgroundEditWrapperProps {
    children: React.ReactNode;
    className?: string;
    onBackgroundChange?: (newColor: string) => void;
    backgroundColor?: string;
    isContextualOverlayType: boolean;
    controlPositionClassName?: string;
}

const BackgroundEditWrapper: React.FC<BackgroundEditWrapperProps> = ({
    children,
    className,
    onBackgroundChange,
    backgroundColor,
    isContextualOverlayType,
    controlPositionClassName
}) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [hexInput, setHexInput] = useState(backgroundColor || (isContextualOverlayType ? '#0f172a' : '#000000'));
    const [panelPosition, setPanelPosition] = useState<{ top: number; left: number } | null>(null);
    const triggerButtonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const defaultColor = isContextualOverlayType ? '#0f172a' : '#000000';

    const isLightBg = isLightColor(backgroundColor);

    const normalizeHexColor = (value: string): string | null => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
        const hex = withHash.slice(1);

        if (/^[0-9a-fA-F]{3}$/.test(hex) || /^[0-9a-fA-F]{6}$/.test(hex)) {
            return withHash.toUpperCase();
        }
        return null;
    };

    const applyHexInput = () => {
        if (!onBackgroundChange) return;
        const normalized = normalizeHexColor(hexInput);
        if (normalized) {
            onBackgroundChange(normalized);
            setHexInput(normalized);
            return;
        }
        setHexInput(backgroundColor || defaultColor);
    };

    const updatePanelPosition = () => {
        const triggerEl = triggerButtonRef.current;
        if (!triggerEl) return;

        const rect = triggerEl.getBoundingClientRect();
        const panelWidth = 256;
        const margin = 12;
        const nextLeft = Math.min(
            Math.max(margin, rect.left),
            Math.max(margin, window.innerWidth - panelWidth - margin)
        );
        const nextTop = rect.bottom + 8;
        setPanelPosition({ top: nextTop, left: nextLeft });
    };

    const setPopoverOpen = (nextOpen: boolean) => {
        setIsPopoverOpen(nextOpen);
        if (nextOpen) {
            setHexInput((backgroundColor || defaultColor).toUpperCase());
            updatePanelPosition();
        }
    };

    useEffect(() => {
        if (!isPopoverOpen) return;
        const handleReposition = () => updatePanelPosition();
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (panelRef.current?.contains(target) || triggerButtonRef.current?.contains(target)) {
                return;
            }
            setIsPopoverOpen(false);
        };

        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);
        document.addEventListener('mousedown', handlePointerDown);

        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [isPopoverOpen]);

    if (!onBackgroundChange) return <>{children}</>;

    return (
        <div className={`relative group/bg ${className}`}>
            {children}
            <div className={cn(
                "absolute top-8 left-8 z-[60] pointer-events-auto transition-opacity",
                isPopoverOpen ? "opacity-100" : "opacity-0 group-hover/bg:opacity-100",
                controlPositionClassName
            )}>
                <button
                    ref={triggerButtonRef}
                    className={cn(
                        "backdrop-blur-md border p-4 rounded-full shadow-sm transition-colors cursor-pointer",
                        isLightBg
                            ? "bg-black/5 border-black/10 hover:bg-black/10"
                            : "bg-white/10 border-white/20 hover:bg-white/20"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        setPopoverOpen(!isPopoverOpen);
                    }}
                >
                    <Palette className="w-8 h-8 drop-shadow-md text-slate-900" />
                </button>
            </div>
            {typeof document !== 'undefined' && isPopoverOpen && panelPosition && createPortal(
                <div
                    ref={panelRef}
                    className="w-80 p-3 z-[80] rounded-md border bg-popover text-popover-foreground shadow-md"
                    style={{ position: 'fixed', top: panelPosition.top, left: panelPosition.left }}
                >
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-500">
                            {isContextualOverlayType ? 'Overlay Color' : 'Background Color'}
                        </label>
                        <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
                            <ChromePicker
                                disableAlpha
                                color={backgroundColor || defaultColor}
                                onChange={(color) => {
                                    onBackgroundChange(color.hex.toUpperCase());
                                    setHexInput(color.hex.toUpperCase());
                                }}
                                styles={{
                                    default: {
                                        picker: {
                                            width: '100%',
                                            boxShadow: 'none',
                                            background: 'transparent',
                                            borderRadius: '0',
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={hexInput}
                                onChange={(e) => setHexInput(e.target.value)}
                                onBlur={applyHexInput}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        applyHexInput();
                                    }
                                }}
                                placeholder={defaultColor}
                                className="h-8 w-28 rounded border border-slate-200 bg-slate-100 px-2 text-xs font-mono text-slate-700 uppercase"
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const LogoOverlay: React.FC<{ logoUrl: string | null; logoCrop: LogoCrop | null }> = ({ logoUrl, logoCrop }) => {
    if (!logoUrl) return null;
    const zoomFactor = logoCrop?.zoom || 1;
    return (
        <div
            style={{
                position: 'absolute',
                bottom: '40px',
                right: '40px',
                maxWidth: `${Math.round(200 * zoomFactor)}px`,
                maxHeight: `${Math.round(120 * zoomFactor)}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                zIndex: 50,
                pointerEvents: 'none'
            }}
        >
            <img
                src={logoUrl}
                alt="Logo"
                style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                }}
            />
        </div>
    );
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
                className="relative shadow-2xl"
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
        </div >
    );
};

export default function VisualPreview({
    slide,
    onChartUpdate,
    onTextChange,
    onBackgroundChange,
    onSlideFieldChange,
    narrationTokens = [],
    timingLinks = [],
    onTextTimingLinkAdd,
    onTextTimingLinkRemove,
}: VisualPreviewProps) {
    const { visual_type, image, chart_data } = slide;
    const allowTimingLinks = !slide.is_assessment;
    const effectiveNarrationTokens = allowTimingLinks ? narrationTokens : [];
    const effectiveTimingLinks = allowTimingLinks ? timingLinks : [];
    const handleTimingLinkAdd = allowTimingLinks ? onTextTimingLinkAdd : undefined;
    const handleTimingLinkRemove = allowTimingLinks ? onTextTimingLinkRemove : undefined;
    const isContextualOverlayType = visual_type === 'contextual_overlay' || visual_type === 'contextual-overlay';
    const [resolvedImage, setResolvedImage] = useState<string | null>(null);
    const [brandColor, setBrandColor] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoCrop, setLogoCrop] = useState<LogoCrop | null>(null);

    // Fetch Brand Colour & Logo
    useEffect(() => {
        const fetchBrandData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('brand_colour')
                    .eq('id', user.id)
                    .single();
                if (profile?.brand_colour) {
                    setBrandColor(profile.brand_colour);
                }

                // Load logo from user metadata
                if (user.user_metadata?.logo_url) {
                    let url = user.user_metadata.logo_url;
                    if (!url.startsWith('http')) {
                        // Resolve signed URL from logos bucket
                        const { data } = await supabase.storage
                            .from('logos')
                            .createSignedUrl(url, 3600);
                        if (data?.signedUrl) {
                            url = data.signedUrl;
                        }
                    }
                    setLogoUrl(url);
                    setLogoCrop((user.user_metadata.logo_crop as LogoCrop) || null);
                }
            }
        };
        fetchBrandData();
    }, []);

    // Effective Accent Color: Brand Color overrides Slide Accent Color
    const effectiveAccentColor = brandColor || slide.accent_color || '#14b8a6';

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

            // It's likely a path, fetch signed URL
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

    // 0. SPECIALIZED TYPES DETECTION
    const specialTypes = ['comparison_split', 'key_stat_breakout', 'document_anchor', 'contextual_overlay', 'contextual-overlay'];
    const isSpecialType = specialTypes.includes(visual_type);

    const convertToMotionGraph = (slideData: SlidePreviewData): MotionGraph | null => {
        const { visual_type: type, layout_data, visual_text, text } = slideData;
        const nodes: MotionNode[] = [];

        if (type === 'comparison_split') {
            nodes.push({
                id: 'node-left',
                type: 'motion-card',
                data: {
                    label: layout_data?.left_label || 'Option A',
                    description: layout_data?.left_text || 'Description for option A',
                    variant: 'negative',
                    icon: 'x-circle',
                    image: typeof layout_data?.left_image === 'string' ? layout_data.left_image : undefined
                }
            });
            nodes.push({
                id: 'node-right',
                type: 'motion-card',
                data: {
                    label: layout_data?.right_label || 'Option B',
                    description: layout_data?.right_text || 'Description for option B',
                    variant: 'positive',
                    icon: 'check-circle-2',
                    image: typeof layout_data?.right_image === 'string' ? layout_data.right_image : undefined
                }
            });
            return { id: 'generated-graph', archetype: 'comparison', nodes, edges: [] };
        }

        if (type === 'key_stat_breakout') {
            nodes.push({
                id: 'stat-main',
                type: 'motion-stat',
                data: {
                    label: layout_data?.stat_label || 'Key Statistic',
                    value: layout_data?.stat_value || '100%',
                    description: visual_text || text || '',
                    variant: 'primary',
                }
            });
            return { id: 'generated-stat', archetype: 'statistic', nodes, edges: [] };
        }

        if (type === 'document_anchor') {
            nodes.push({
                id: 'doc-quote',
                type: 'motion-card',
                data: {
                    label: layout_data?.verbatim_quote || visual_text || 'Quoted Text',
                    subLabel: layout_data?.source_reference || 'Source Document',
                    description: layout_data?.context_note || 'Key Reference',
                    variant: 'accent',
                    icon: 'file-text'
                }
            });
            return { id: 'generated-doc', archetype: 'document-anchor', nodes, edges: [] };
        }

        if (type === 'contextual_overlay' || type === 'contextual-overlay') {
            nodes.push({
                id: 'context-main',
                type: 'motion-card',
                data: {
                    label: visual_text || 'Section Title',
                    subLabel: layout_data?.kicker || 'INTRODUCTION',
                    description: text || '',
                    variant: 'neutral',
                    icon: 'map-pin'
                }
            });
            return { id: 'generated-overlay', archetype: 'contextual-overlay', nodes, edges: [] };
        }

        return null;
    };

    const [resolvedGraphData, setResolvedGraphData] = useState<MotionGraph | null>(null);

    useEffect(() => {
        let active = true;

        const resolveImages = async () => {
            if (!((visual_type === 'chart' && chart_data) || isSpecialType)) {
                if (active) setResolvedGraphData(null);
                return;
            }

            let graphData: MotionGraph | null = chart_data || null;

            if (isSpecialType) {
                graphData = convertToMotionGraph(slide);
            }

            if (!graphData || !graphData.nodes) {
                if (active) setResolvedGraphData(null);
                return;
            }

            // clone to avoid mutating standard ref if needed, though we're creating new obj most of time
            const newNodes = [...graphData.nodes];
            let hasChanges = false;

            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

            // Iterate and sign images
            await Promise.all(newNodes.map(async (node: MotionNode, index: number) => {
                if (node.data && node.data.image && !node.data.image.startsWith('http') && !node.data.image.startsWith('blob:')) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/course/get-signed-url`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${session?.access_token}`
                            },
                            body: JSON.stringify({ path: node.data.image })
                        });

                        if (res.ok) {
                            const data = await res.json();
                            // Create new node object to trigger react updates if needed
                            newNodes[index] = {
                                ...node,
                                data: {
                                    ...node.data,
                                    image: data.signed_url
                                }
                            };
                            hasChanges = true;
                        }
                    } catch (e) {
                        console.error("Failed to sign node image:", e);
                    }
                }
            }));

            if (active) {
                setResolvedGraphData(hasChanges ? { ...graphData, nodes: newNodes } : graphData);
            }
        };

        resolveImages();

        return () => { active = false; };
    }, [slide, visual_type, chart_data, isSpecialType]);

    // Fallback if no visual yet
    if (!image && !chart_data && visual_type !== 'kinetic_text' && visual_type !== 'title_card' && !isSpecialType) {
        return (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                Drafting Visual...
            </div>
        );
    }

    // 1. CHART RENDERER (Including new types that map to MotionGraph)
    // Check if it's a chart OR one of our new specialized types
    if ((visual_type === 'chart' && chart_data) || isSpecialType) {

        // Show loading state if we expect data but haven't processed it yet
        if (!resolvedGraphData) {
            return (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                    Loading Chart...
                </div>
            );
        }

        const handleSpecialGraphUpdate = (newData: MotionGraph) => {
            const firstNode = newData.nodes[0];
            const secondNode = newData.nodes[1];
            if (!firstNode) return;

            if (visual_type === 'contextual_overlay' || visual_type === 'contextual-overlay') {
                onTextChange?.(firstNode.data.label || '');
                onSlideFieldChange?.('text', firstNode.data.description || '');
                onSlideFieldChange?.('layout_data', {
                    ...(slide.layout_data || {}),
                    kicker: firstNode.data.subLabel || ''
                });
                return;
            }

            if (visual_type === 'comparison_split') {
                onSlideFieldChange?.('layout_data', {
                    ...(slide.layout_data || {}),
                    left_label: firstNode.data.label || '',
                    left_text: firstNode.data.description || '',
                    right_label: secondNode?.data.label || '',
                    right_text: secondNode?.data.description || '',
                });
                return;
            }

            if (visual_type === 'key_stat_breakout') {
                onSlideFieldChange?.('layout_data', {
                    ...(slide.layout_data || {}),
                    stat_label: firstNode.data.label || '',
                    stat_value: typeof firstNode.data.value === 'string' ? firstNode.data.value : String(firstNode.data.value || ''),
                });
                onTextChange?.(firstNode.data.description || '');
                return;
            }

            if (visual_type === 'document_anchor') {
                onTextChange?.(firstNode.data.label || '');
                onSlideFieldChange?.('layout_data', {
                    ...(slide.layout_data || {}),
                    verbatim_quote: firstNode.data.label || '',
                    source_reference: firstNode.data.subLabel || '',
                    context_note: firstNode.data.description || '',
                });
            }
        };

        const allowsTextTimingInGraph =
            visual_type === 'document_anchor' ||
            visual_type === 'contextual_overlay' ||
            visual_type === 'contextual-overlay' ||
            visual_type === 'key_stat_breakout';
        const allowsNodeTimingInGraph = visual_type === 'chart' || visual_type === 'comparison_split';
        const allowTimingInGraph = allowTimingLinks && (allowsNodeTimingInGraph || allowsTextTimingInGraph);

        return (
            <ScaleContainer>
                {/* Background editing for Chart might be complex due to canvas, putting wrapper around */}
                <BackgroundEditWrapper
                    className="w-full h-full"
                    onBackgroundChange={onBackgroundChange}
                    backgroundColor={slide.background_color}
                    isContextualOverlayType={isContextualOverlayType}
                >
                    <MotionGraphPreview
                        data={resolvedGraphData}
                        accentColor={effectiveAccentColor}
                        backgroundColor={slide.background_color}
                        textColor={slide.text_color}
                        backgroundImage={resolvedImage}
                        narrationTokens={effectiveNarrationTokens}
                        timingLinks={effectiveTimingLinks}
                        onTimingLinkAdd={allowTimingInGraph ? handleTimingLinkAdd : undefined}
                        onTimingLinkRemove={allowTimingInGraph ? handleTimingLinkRemove : undefined}
                        enableNodeTiming={allowsNodeTimingInGraph}
                        onUpdate={
                            visual_type === 'chart'
                                ? onChartUpdate
                                : isSpecialType
                                    ? handleSpecialGraphUpdate
                                    : undefined
                        }
                    />
                    <LogoOverlay logoUrl={logoUrl} logoCrop={logoCrop} />
                </BackgroundEditWrapper>
            </ScaleContainer>
        );
    }

    // 2. KINETIC TEXT RENDERER
    if (visual_type === 'kinetic_text') {
        const textContent = slide.visual_text || slide.text || "";

        return (
            <ScaleContainer>
                <BackgroundEditWrapper
                    className="w-full h-full"
                    onBackgroundChange={onBackgroundChange}
                    backgroundColor={slide.background_color}
                    isContextualOverlayType={isContextualOverlayType}
                >
                    <div
                        className="slide-preview-content w-full h-full p-8 flex items-center justify-center transition-all duration-500"
                        style={{
                            background: `linear-gradient(135deg, ${brandColor || slide.background_color || '#0f172a'} 0%, ${isLightColor(brandColor || slide.background_color || '#0f172a') ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.4)'} 100%)`,
                            backgroundColor: brandColor || slide.background_color || '#0f172a',
                            color: slide.text_color || '#ffffff'
                        }}
                    >
                        <div className="w-full text-center">
                            <style>{`
                                .ProseMirror {
                                    --editor-default-size: 32px;
                                }
                                .ProseMirror h1, .prose-preview h1 { 
                                    font-weight: 950 !important; 
                                    font-size: 96px !important; 
                                    line-height: 1.05 !important; 
                                    margin-bottom: 0.5rem !important; 
                                    text-shadow: 0 15px 45px rgba(0,0,0,0.5) !important; 
                                }
                                .ProseMirror h2, .prose-preview h2 { 
                                    font-weight: 800 !important; 
                                    font-size: 48px !important; 
                                    line-height: 1.25 !important; 
                                    letter-spacing: 0.05em !important; 
                                    margin-bottom: 0.5rem !important; 
                                    text-shadow: 0 5px 20px rgba(0,0,0,0.3) !important;
                                }
                                .ProseMirror p, .prose-preview p { 
                                    font-weight: 600 !important; 
                                    font-size: 36px !important; 
                                    line-height: 1.625 !important; 
                                    margin-bottom: 0.75rem !important; 
                                    opacity: 0.95 !important; 
                                    text-shadow: 0 2px 15px rgba(0,0,0,0.2) !important;
                                }
                                .ProseMirror ul, .prose-preview ul { list-style-type: disc !important; text-align: left !important; padding-left: 1.5em !important; }
                                .ProseMirror li, .prose-preview li { margin-bottom: 0.5em !important; font-size: 30px !important; font-weight: 600 !important; }
                                .ProseMirror strong, .prose-preview strong { color: ${effectiveAccentColor} !important; font-weight: 900 !important; }
                             `}</style>
                            {onTextChange ? (
                                <RichTextEditor
                                    value={textContent}
                                    onChange={onTextChange}
                                    variant="minimal"
                                    narrationTokens={effectiveNarrationTokens}
                                    timingLinks={effectiveTimingLinks}
                                    onTimingLinkAdd={handleTimingLinkAdd}
                                    onTimingLinkRemove={handleTimingLinkRemove}
                                />
                            ) : (
                                <div className="prose-preview dark:prose-invert max-w-none">
                                    {parse(textContent)}
                                </div>
                            )}
                        </div>
                    </div>
                    <LogoOverlay logoUrl={logoUrl} logoCrop={logoCrop} />
                </BackgroundEditWrapper>
            </ScaleContainer>
        )
    }

    // 3. TITLE CARD RENDERER
    if (visual_type === 'title_card') {
        const textContent = slide.visual_text || slide.text || "";
        const isThankYou = slide.text?.toLowerCase().includes("thank you");
        const defaultBg = isThankYou ? '#1e293b' : '#0d9488'; // slate-800 or teal-600

        return (
            <ScaleContainer>
                <BackgroundEditWrapper
                    className="w-full h-full"
                    onBackgroundChange={onBackgroundChange}
                    backgroundColor={slide.background_color}
                    isContextualOverlayType={isContextualOverlayType}
                >
                    <div
                        className="slide-preview-content w-full h-full flex flex-col items-center justify-center p-12 text-center"
                        style={{
                            backgroundColor: slide.background_color || defaultBg,
                            color: slide.text_color || '#ffffff'
                        }}
                    >
                        <AutoFitText className="items-center justify-center origin-center">
                            <div className="w-full text-center">
                                <style>{`
                                        .ProseMirror h1 { font-weight: 900; font-size: 3.75rem; line-height: 1; margin-bottom: 0.5rem; text-shadow: 0 4px 20px rgba(0,0,0,0.15); }
                                        .ProseMirror h2 { font-weight: 700; font-size: 1.5rem; line-height: 1.25; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
                                        .ProseMirror p { font-weight: 500; font-size: 1.5rem; line-height: 1.625; margin-bottom: 0.75rem; opacity: 0.95; }
                                        .ProseMirror strong { color: rgba(255,255,255,0.9); }
                                     `}</style>
                                {onTextChange ? (
                                    <RichTextEditor
                                        value={textContent}
                                        onChange={onTextChange}
                                        variant="minimal"
                                        narrationTokens={effectiveNarrationTokens}
                                        timingLinks={effectiveTimingLinks}
                                        onTimingLinkAdd={handleTimingLinkAdd}
                                        onTimingLinkRemove={handleTimingLinkRemove}
                                    />
                                ) : (
                                    // Fallback read-only using same styles roughly
                                    <div className="prose prose-2xl dark:prose-invert max-w-none">
                                        {parse(textContent)}
                                    </div>
                                )}
                            </div>
                        </AutoFitText>

                    </div>
                    <LogoOverlay logoUrl={logoUrl} logoCrop={logoCrop} />
                </BackgroundEditWrapper>
            </ScaleContainer>
        )
    }

    // 4. HYBRID RENDERER (Text Left 50%, Image Right 50% -> Now with Curve and Gradient)
    const isHybrid = visual_type === 'hybrid' || (!visual_type && !!slide.visual_text);

    if (isHybrid) {
        const textContent = slide.visual_text || slide.text || "";
        const baseColor = slide.background_color || '#0f172a';

        return (
            <ScaleContainer>
                <div className="w-full h-full relative bg-slate-900 overflow-hidden">
                    {/* Right: Image Layer (Sits behind text partially) */}
                    <div className="absolute top-0 right-0 w-[60%] h-full bg-slate-800">
                        {resolvedImage ? (
                            <img
                                src={resolvedImage}
                                alt={slide.prompt || "Slide Visual"}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 p-4 text-center bg-slate-200">
                                {image ? <div className="flex flex-col items-center gap-2"><RefreshCcw className="animate-spin h-6 w-6" /> <span className="font-bold">Loading Visual...</span></div> : "No Image"}
                            </div>
                        )}
                    </div>

                    {/* Left: Text - Curved Cutout & Gradient */}
                    <BackgroundEditWrapper
                        className="w-full h-full absolute inset-0 pointer-events-none"
                        onBackgroundChange={onBackgroundChange}
                        backgroundColor={slide.background_color}
                        isContextualOverlayType={isContextualOverlayType}
                    >
                        {/* SVG Definition for the Curve using objectBoundingBox for responsiveness */}
                        <svg className="absolute w-0 h-0" aria-hidden="true" focusable="false">
                            <defs>
                                <clipPath id="hybrid-curve-clip" clipPathUnits="objectBoundingBox">
                                    <path d="M 0 0 L 0.85 0 Q 1 0.5 0.85 1 L 0 1 Z" />
                                </clipPath>
                            </defs>
                        </svg>

                        <div
                            className="h-full w-[55%] relative z-10 pointer-events-auto flex flex-col justify-center p-24 shadow-2xl transition-all duration-500"
                            style={{
                                background: `linear-gradient(135deg, ${brandColor || baseColor} 0%, ${isLightColor(brandColor || baseColor) ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.4)'} 100%)`,
                                backgroundColor: brandColor || baseColor,
                                clipPath: 'url(#hybrid-curve-clip)'
                            }}
                        >
                            {/* Gradient reinforcement to ensure legibility over the curve */}
                            <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none mix-blend-multiply" />

                            <div className="relative z-20 max-w-2xl space-y-6" style={{ color: slide.text_color || '#ffffff' }}>
                                {/* Typography matching contextual_overlay at 1920px base */}
                                <style>{`
                                .hybrid-text {
                                    --editor-default-size: 28px;
                                }
                                .hybrid-text h1, .hybrid-text .ProseMirror h1 { 
                                    font-weight: 950 !important; 
                                    font-size: 84px !important;
                                    line-height: 1.05 !important; 
                                    margin-bottom: 32px !important;
                                    text-shadow: 0 10px 40px rgba(0,0,0,0.6) !important;
                                    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
                                }
                                .hybrid-text h2, .hybrid-text .ProseMirror h2 { 
                                    font-weight: 800 !important; 
                                    font-size: 48px !important;
                                    line-height: 1.2 !important;
                                    letter-spacing: 0.05em !important;
                                    margin-bottom: 24px !important;
                                    text-shadow: 0 5px 20px rgba(0,0,0,0.4) !important;
                                }
                                .hybrid-text p, .hybrid-text .ProseMirror p { 
                                    font-weight: 600 !important;
                                    font-size: 32px !important;
                                    line-height: 1.6 !important; 
                                    margin-bottom: 24px !important;
                                    opacity: 0.95 !important;
                                    text-shadow: 0 2px 15px rgba(0,0,0,0.3) !important;
                                }
                                .hybrid-text ul, .hybrid-text .ProseMirror ul { list-style-type: disc !important; padding-left: 1.5em !important; }
                                .hybrid-text li, .hybrid-text .ProseMirror li { margin-bottom: 16px !important; font-size: 30px !important; font-weight: 600 !important; }
                                .hybrid-text strong, .hybrid-text .ProseMirror strong { color: ${effectiveAccentColor} !important; font-weight: 900 !important; }
                            `}</style>
                                <div className="hybrid-text">
                                    {onTextChange ? (
                                        <RichTextEditor
                                            value={textContent}
                                            onChange={onTextChange}
                                            variant="minimal"
                                            narrationTokens={effectiveNarrationTokens}
                                            timingLinks={effectiveTimingLinks}
                                            onTimingLinkAdd={handleTimingLinkAdd}
                                            onTimingLinkRemove={handleTimingLinkRemove}
                                        />
                                    ) : (
                                        <div className="max-w-none">
                                            {/* Fallback for plain text: wrap in h1 if not HTML */}
                                            {/<[a-z][\s\S]*>/i.test(textContent) ? (
                                                parse(textContent)
                                            ) : (
                                                <h1>{textContent}</h1>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </BackgroundEditWrapper>
                    <LogoOverlay logoUrl={logoUrl} logoCrop={logoCrop} />
                </div>
            </ScaleContainer>
        )
    }

    // 5. IMAGE RENDERER (Default)
    return (
        <ScaleContainer>
            <div className="w-full h-full relative bg-slate-100 overflow-hidden group">
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
                    <div className="absolute inset-0 flex items-center justify-center p-12">
                        <div className="max-w-4xl w-full text-center">
                            <style>{`
                                .overlay-text h1, .overlay-text h2, .overlay-text p { 
                                    font-weight: 800; 
                                    color: white;
                                    text-shadow: 0 4px 12px rgba(0,0,0,0.8);
                                    margin: 0;
                                }
                                .overlay-text h1 { font-size: 3.5rem; line-height: 1.1; }
                                .overlay-text p, .overlay-text h2 { font-size: 2.5rem; line-height: 1.3; }
                                .overlay-text strong { color: ${brandColor || '#ffffff'}; }
                            `}</style>
                            <div className="overlay-text">
                                {onTextChange ? (
                                    <RichTextEditor
                                        value={slide.visual_text}
                                        onChange={onTextChange}
                                        variant="minimal"
                                        narrationTokens={effectiveNarrationTokens}
                                        timingLinks={effectiveTimingLinks}
                                        onTimingLinkAdd={handleTimingLinkAdd}
                                        onTimingLinkRemove={handleTimingLinkRemove}
                                    />
                                ) : (
                                    <h1 className="text-6xl font-black text-white drop-shadow-xl leading-none">
                                        {parse(slide.visual_text)}
                                    </h1>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <LogoOverlay logoUrl={logoUrl} logoCrop={logoCrop} />
            </div>
        </ScaleContainer>
    );
}
