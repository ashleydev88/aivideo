import React from 'react';
import { Composition } from 'remotion';
import { MainComposition } from './Composition';
import { MotionFlowComposition } from './components/MotionFlowComposition';
import './style.css';

// Calculate total frames based on slide durations
const calculateMetadata = ({ props }: { props: { slide_data: any[]; accent_color: string } }) => {
    // Debug: Log incoming props
    console.log(`[Remotion] calculateMetadata called`);
    if (!props.slide_data || props.slide_data.length === 0) {
        console.log(`[Remotion] slide_data is empty`);
    }

    const totalDurationMs = (props.slide_data || []).reduce((sum, slide) => {
        return sum + (slide.duration || 5000);
    }, 0);

    const fps = 30;
    const durationInFrames = Math.ceil(totalDurationMs / 1000 * fps);

    return {
        durationInFrames: Math.max(durationInFrames, 30), // Minimum 1 second
        fps,
        width: 1920,
        height: 1080,
    };
};

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="Main"
                component={MainComposition}
                calculateMetadata={calculateMetadata}
                defaultProps={{
                    slide_data: [],
                    accent_color: '#14b8a6'
                }}
            />
            <Composition
                id="MotionFlowPreview"
                component={MotionFlowComposition}
                durationInFrames={300}
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};
