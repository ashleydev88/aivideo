import React from 'react';
import { Composition } from 'remotion';
import { MainComposition } from './Composition';
import './style.css';

// Calculate total frames based on slide durations
const calculateMetadata = ({ props }: { props: { slide_data: any[]; accent_color: string } }) => {
    // Debug: Log incoming props
    console.log(`[Remotion] calculateMetadata called`);
    console.log(`[Remotion] slide_data type: ${typeof props.slide_data}`);
    console.log(`[Remotion] slide_data is array: ${Array.isArray(props.slide_data)}`);
    console.log(`[Remotion] slide_data length: ${props.slide_data?.length ?? 'undefined'}`);

    if (!props.slide_data || props.slide_data.length === 0) {
        console.error(`[Remotion] ERROR: slide_data is empty or undefined!`);
        console.log(`[Remotion] Full props:`, JSON.stringify(props).substring(0, 500));
    } else {
        console.log(`[Remotion] First slide duration: ${props.slide_data[0]?.duration}`);
        console.log(`[Remotion] First slide image: ${props.slide_data[0]?.image?.substring(0, 80)}`);
    }

    const totalDurationMs = (props.slide_data || []).reduce((sum, slide) => {
        return sum + (slide.duration || 5000);
    }, 0);

    const fps = 30;
    const durationInFrames = Math.ceil(totalDurationMs / 1000 * fps);

    console.log(`[Remotion] Calculated duration: ${totalDurationMs}ms = ${durationInFrames} frames`);

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
        </>
    );
};
