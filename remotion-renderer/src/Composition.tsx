import React from 'react';
import { AbsoluteFill, Sequence, Audio } from 'remotion';
import { Background } from './components/Background';
import { WatercolourImage } from './components/WatercolourImage';
import { KineticText } from './components/KineticText';
import { Chart } from './components/Chart';
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

                return (
                    <Sequence key={i} from={fromFrame} durationInFrames={durationFrames}>
                        {/* Audio */}
                        {slide.audio && <Audio src={slide.audio} />}

                        {/* Visual Layer */}
                        <AbsoluteFill className="items-center justify-center p-8">

                            {/* CHART Type */}
                            {slide.visual_type === 'chart' && slide.chart_data && (
                                <Chart data={slide.chart_data} accent_color={accent_color} />
                            )}

                            {/* IMAGE Type or HYBRID fallback */}
                            {(slide.visual_type === 'image' || slide.visual_type === 'hybrid' || (!slide.chart_data && slide.image)) && slide.image && (
                                <WatercolourImage src={slide.image} />
                            )}

                            {/* KINETIC TEXT Overlay (for hybrid or text types) */}
                            {(slide.visual_type === 'kinetic_text' || slide.visual_type === 'hybrid') && (
                                <KineticText
                                    text={slide.visual_text || slide.text}
                                    timestamps={slide.timestamps}
                                    accent_color={accent_color}
                                />
                            )}

                        </AbsoluteFill>
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};

