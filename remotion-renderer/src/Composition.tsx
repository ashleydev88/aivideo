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
}> = ({ slide_data, accent_color }) => {
    let currentFrame = 0;

    return (
        <AbsoluteFill>
            <Background />

            {slide_data.map((slide, i) => {
                const durationFrames = Math.floor((slide.duration || 5000) / 1000 * 30);
                const fromFrame = currentFrame;
                currentFrame += durationFrames;

                const isHybrid = slide.visual_type === 'hybrid';
                const isImageOnly = slide.visual_type === 'image';
                const isKineticOnly = slide.visual_type === 'kinetic_text';
                const isChart = slide.visual_type === 'chart';
                const isTitleCard = slide.visual_type === 'title_card';
                const hasText = slide.text || slide.visual_text;

                // Debug logging
                console.log(`[Slide ${i}] visual_type: ${slide.visual_type}, hasImage: ${!!slide.image}, hasText: ${!!hasText}`);
                console.log(`[Slide ${i}] Layout flags: hybrid=${isHybrid}, imageOnly=${isImageOnly}, kineticOnly=${isKineticOnly}, chart=${isChart}, titleCard=${isTitleCard}`);

                return (
                    <Sequence key={i} from={fromFrame} durationInFrames={durationFrames}>
                        {/* Audio */}
                        {slide.audio && <Audio src={slide.audio} />}

                        {/* LAYOUT: TITLE CARD (Welcome/Thank You) */}
                        {isTitleCard && (
                            <TitleCard
                                title={slide.visual_text || slide.text}
                                accent_color={accent_color}
                            />
                        )}

                        {/* LAYOUT: CHART (Full Screen) */}
                        {isChart && slide.chart_data && (
                            <AbsoluteFill className="flex items-center justify-center p-8">
                                <Chart data={slide.chart_data} accent_color={accent_color} />
                            </AbsoluteFill>
                        )}

                        {/* LAYOUT: IMAGE ONLY (Full Screen) */}
                        {isImageOnly && slide.image && (
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

                        {/* LAYOUT: KINETIC TEXT ONLY (Full Screen Text) */}
                        {isKineticOnly && hasText && (
                            <AbsoluteFill>
                                <KineticText
                                    text={slide.text || slide.visual_text}
                                    timestamps={slide.timestamps}
                                    accent_color={accent_color}
                                    fullScreen={true}
                                    kinetic_events={slide.kinetic_events}
                                />
                            </AbsoluteFill>
                        )}

                        {/* LAYOUT: HYBRID (Text Left 50%, Image Right 50%) */}
                        {isHybrid && slide.image && (
                            <AbsoluteFill className="flex flex-row">
                                {/* Left Side: Kinetic Text */}
                                <div className="w-1/2 h-full flex items-center justify-center p-8">
                                    {hasText && (
                                        <KineticText
                                            text={slide.text || slide.visual_text}
                                            timestamps={slide.timestamps}
                                            accent_color={accent_color}
                                            fullScreen={false}
                                            kinetic_events={slide.kinetic_events}
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
        </AbsoluteFill>
    );
};
