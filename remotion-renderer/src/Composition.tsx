import React from 'react';
import { AbsoluteFill, Sequence, Audio, Img } from 'remotion';
import parse from 'html-react-parser';
import { Background } from './components/Background';
import { KineticText } from './components/KineticText';
import { Chart } from './components/Chart';
import { TitleCard } from './components/TitleCard';
import './style.css';

const hexToRgba = (hex: string, alpha: number) => {
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return hex;
};

export const MainComposition: React.FC<{
    slide_data: any[];
    accent_color: string;
    logo_url?: string;
    logo_crop?: any;
}> = ({ slide_data, accent_color, logo_url, logo_crop }) => {
    let currentFrame = 0;

    return (
        <AbsoluteFill>
            <Background />

            {slide_data.map((slide, i) => {
                const durationFrames = Math.floor((slide.duration || 5000) / 1000 * 30);
                const fromFrame = currentFrame;
                currentFrame += durationFrames;

                const hasVisualText = !!(slide.visual_text && slide.visual_text.trim().length > 0);
                const isHybrid = slide.visual_type === 'hybrid';
                const isImageOnly = slide.visual_type === 'image';
                const isKineticOnly = slide.visual_type === 'kinetic_text';
                const isChart = slide.visual_type === 'chart';
                const isTitleCard = slide.visual_type === 'title_card';
                const isContextualOverlay = slide.visual_type === 'contextual_overlay';
                const isComparisonSplit = slide.visual_type === 'comparison_split';
                const hasText = slide.text || slide.visual_text;

                const customBg = slide.background_color;
                const customText = slide.text_color;

                // Debug logging
                console.log(`[Slide ${i}] visual_type: ${slide.visual_type}, hasImage: ${!!slide.image}, hasText: ${!!hasText}`);
                console.log(`[Slide ${i}] Layout flags: hybrid=${isHybrid}, imageOnly=${isImageOnly}, kineticOnly=${isKineticOnly}, chart=${isChart}, titleCard=${isTitleCard}, contextualOverlay=${isContextualOverlay}`);

                // Title Card Logic
                let titleCardBg = customBg;
                let titleCardText = customText;

                if (isTitleCard && !customBg) {
                    const textContent = (slide.text || slide.visual_text || '').toLowerCase();
                    const isThankYou = textContent.includes("thank you");
                    titleCardBg = isThankYou ? '#1e293b' : '#0d9488';
                    if (!customText) titleCardText = '#ffffff'; // Default to white text on colored bg
                }

                return (
                    <Sequence key={i} from={fromFrame} durationInFrames={durationFrames}>
                        {/* Audio */}
                        {slide.audio && <Audio src={slide.audio} />}

                        {/* LAYOUT: TITLE CARD (Welcome/Thank You) */}
                        {isTitleCard && (
                            <TitleCard
                                title={slide.visual_text || slide.text}
                                accent_color={accent_color}
                                custom_bg_color={titleCardBg}
                                custom_text_color={titleCardText}
                            />
                        )}

                        {/* LAYOUT: CHART (Full Screen) */}
                        {isChart && slide.chart_data && (
                            <AbsoluteFill className="flex items-center justify-center p-8">
                                <Chart
                                    data={slide.chart_data}
                                    title={slide.visual_text}
                                    accent_color={accent_color}
                                    custom_bg_color={customBg}
                                    custom_text_color={customText}
                                />
                            </AbsoluteFill>
                        )}

                        {/* LAYOUT: IMAGE ONLY (Full Screen) OR CONTEXTUAL OVERLAY */}
                        {(isImageOnly || isContextualOverlay) && slide.image && (
                            <AbsoluteFill
                                className="flex items-center justify-center p-12"
                                style={{ backgroundColor: customBg || '#000000' }}
                            >
                                <Img
                                    src={slide.image}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    style={{
                                        filter: 'contrast(1.05) saturate(1.1)',
                                    }}
                                />
                                {/* Overlay Text (Match Preview) */}
                                {slide.visual_text && (
                                    <div className="relative z-10 max-w-4xl text-center">
                                        {/<[a-z][\s\S]*>/i.test(slide.visual_text) ? (
                                            <div className="prose prose-2xl prose-invert max-w-none">
                                                <style>{`
                                                    h1, h2, p { 
                                                        font-weight: 800 !important; 
                                                        color: white !important;
                                                        text-shadow: 0 4px 12px rgba(0,0,0,0.8) !important;
                                                        text-align: center !important;
                                                        margin: 0 !important;
                                                    }
                                                    h1 { font-size: 5rem !important; line-height: 1.1 !important; margin-bottom: 1rem !important; }
                                                    h2, p { font-size: 3.5rem !important; line-height: 1.3 !important; }
                                                    strong { color: ${accent_color} !important; }
                                                `}</style>
                                                {parse(slide.visual_text)}
                                            </div>
                                        ) : (
                                            <div
                                                className="font-sans font-extrabold text-white leading-tight whitespace-pre-wrap"
                                                style={{
                                                    fontSize: '3.5rem',
                                                    textShadow: '0 4px 12px rgba(0,0,0,0.8)'
                                                }}
                                            >
                                                {slide.visual_text}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </AbsoluteFill>
                        )}

                        {/* LAYOUT: KINETIC TEXT ONLY (Full Screen Text) */}
                        {isKineticOnly && hasText && (
                            <AbsoluteFill>
                                <KineticText
                                    text={slide.visual_text || slide.text}
                                    timestamps={slide.timestamps}
                                    accent_color={accent_color}
                                    fullScreen={true}
                                    kinetic_events={slide.kinetic_events}
                                    custom_bg_color={customBg}
                                    custom_text_color={customText}
                                />
                            </AbsoluteFill>
                        )}

                        {/* LAYOUT: HYBRID (Text Left 50%, Image Right 50%) */}
                        {isHybrid && slide.image && (
                            <AbsoluteFill className="flex flex-row">
                                {/* Left Side: Kinetic Text */}
                                <div
                                    className="w-1/2 h-full flex items-center justify-center p-8"
                                    style={{ backgroundColor: accent_color || customBg || '#0f172a' }} // Brand color on Left Side
                                >
                                    {hasText && (
                                        <KineticText
                                            text={slide.visual_text || slide.text}
                                            timestamps={slide.timestamps}
                                            accent_color={accent_color}
                                            fullScreen={false}
                                            kinetic_events={slide.kinetic_events}
                                            custom_text_color={customText}
                                        />
                                    )}
                                </div>
                                {/* Right Side: Image */}
                                <div className="w-1/2 h-full flex items-center justify-center">
                                    <Img
                                        src={slide.image}
                                        className="w-full h-full object-cover"
                                        style={{
                                            filter: 'contrast(1.05) saturate(1.1)',
                                        }}
                                    />
                                </div>
                            </AbsoluteFill>
                        )}

                        {/* LAYOUT: COMPARISON SPLIT (Side by Side with Images) */}
                        {isComparisonSplit && slide.layout_data && (
                            <AbsoluteFill className="flex items-center justify-center p-8">
                                <Chart
                                    data={{
                                        title: slide.visual_text || slide.text,
                                        type: 'comparison',
                                        items: [
                                            {
                                                label: slide.layout_data.left_label || "Don't",
                                                description: slide.layout_data.left_text,
                                                image: slide.layout_data.left_image,
                                                color_intent: 'danger'
                                            },
                                            {
                                                label: slide.layout_data.right_label || "Do",
                                                description: slide.layout_data.right_text,
                                                image: slide.layout_data.right_image,
                                                color_intent: 'success'
                                            }
                                        ]
                                    }}
                                    title={slide.visual_text}
                                    accent_color={accent_color}
                                    custom_bg_color={customBg}
                                    custom_text_color={customText}
                                />
                            </AbsoluteFill>
                        )}

                        {/* FALLBACK: If no visual_type but has image, show full screen image */}
                        {!isChart && !isImageOnly && !isKineticOnly && !isHybrid && !isTitleCard && !isComparisonSplit && slide.image && (
                            <AbsoluteFill className="flex items-center justify-center">
                                <Img
                                    src={slide.image}
                                    className="w-full h-full object-cover"
                                    style={{
                                        filter: 'contrast(1.05) saturate(1.1)',
                                    }}
                                />
                            </AbsoluteFill>
                        )}
                    </Sequence>
                );
            })}

            {/* Global Logo Overlay (only if logo_url is provided and it's a first/last slide) */}
            {logo_url && (
                <AbsoluteFill style={{ pointerEvents: 'none' }}>
                    {slide_data.map((slide, i) => {
                        const durationFrames = Math.floor((slide.duration || 5000) / 1000 * 30);
                        const fromFrame = slide_data.slice(0, i).reduce((acc, s) => acc + Math.floor((s.duration || 5000) / 1000 * 30), 0);

                        return (
                            <Sequence key={`logo-${i}`} from={fromFrame} durationInFrames={durationFrames}>
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '40px',
                                        right: '40px',
                                        maxWidth: `${Math.round(200 * (logo_crop?.zoom || 1))}px`,
                                        maxHeight: `${Math.round(120 * (logo_crop?.zoom || 1))}px`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <Img
                                        src={logo_url}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain'
                                        }}
                                    />
                                </div>
                            </Sequence>
                        );
                    })}
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    );
};
