import React from 'react';
import { AbsoluteFill, Sequence, Audio, Img } from 'remotion';
import { Background } from './components/Background';
import { KineticText } from './components/KineticText';
import { Chart } from './components/Chart';
import { TitleCard } from './components/TitleCard';
import './style.css';

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
                const isHybrid = slide.visual_type === 'hybrid' || (slide.visual_type === 'image' && hasVisualText);
                const isImageOnly = slide.visual_type === 'image' && !hasVisualText;
                const isKineticOnly = slide.visual_type === 'kinetic_text';
                const isChart = slide.visual_type === 'chart';
                const isTitleCard = slide.visual_type === 'title_card';
                const hasText = slide.text || slide.visual_text;

                const customBg = slide.background_color;
                const customText = slide.text_color;

                // Debug logging
                console.log(`[Slide ${i}] visual_type: ${slide.visual_type}, hasImage: ${!!slide.image}, hasText: ${!!hasText}`);
                console.log(`[Slide ${i}] Layout flags: hybrid=${isHybrid}, imageOnly=${isImageOnly}, kineticOnly=${isKineticOnly}, chart=${isChart}, titleCard=${isTitleCard}`);

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

                        {/* LAYOUT: IMAGE ONLY (Full Screen) */}
                        {isImageOnly && slide.image && (
                            <AbsoluteFill
                                className="flex items-center justify-center"
                                style={{ backgroundColor: customBg || '#000000' }}
                            >
                                <Img
                                    src={slide.image}
                                    className="w-full h-full object-cover"
                                    style={{
                                        filter: 'contrast(1.05) saturate(1.1)',
                                    }}
                                />
                                {/* Overlay Text (Match Preview) */}
                                {slide.visual_text && (
                                    <div className="absolute bottom-12 left-12 right-12 bg-black/60 backdrop-blur-md p-8 rounded-2xl text-white">
                                        <div className="font-mono text-xl opacity-70 mb-2 font-bold tracking-wider">ON-SCREEN TEXT</div>
                                        <div className="font-sans text-3xl font-bold leading-relaxed whitespace-pre-wrap">
                                            {slide.visual_text}
                                        </div>
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
                                    style={{ backgroundColor: customBg || undefined }} // Default is transparent/inherited from Background component? No, usually AbsoluteFill is clear.
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

                        {/* FALLBACK: If no visual_type but has image, show full screen image */}
                        {!isChart && !isImageOnly && !isKineticOnly && !isHybrid && !isTitleCard && slide.image && (
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

                        // Only show on first and last slide
                        if (i !== 0 && i !== slide_data.length - 1) return null;

                        return (
                            <Sequence key={`logo-${i}`} from={fromFrame} durationInFrames={durationFrames}>
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '40px',
                                        left: '40px',
                                        width: '120px',
                                        height: '120px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                        backdropFilter: 'blur(10px)',
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        padding: '10px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.5)'
                                    }}
                                >
                                    <Img
                                        src={logo_url}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                            transform: logo_crop ? `scale(${logo_crop.zoom || 1})` : 'none',
                                            transformOrigin: 'center'
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
