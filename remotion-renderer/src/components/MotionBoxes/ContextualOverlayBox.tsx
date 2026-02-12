import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import * as Lucide from 'lucide-react';
import { MotionNodeData } from '../../types/MotionGraph';

interface ContextualOverlayBoxProps extends MotionNodeData {
    delay?: number;
}

export const ContextualOverlayBox: React.FC<ContextualOverlayBoxProps> = ({
    label,
    subLabel,
    description,
    delay = 0,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const spr = spring({
        frame: frame - delay,
        fps,
        config: { damping: 15, stiffness: 80, mass: 1.2 } // Slower, heavier feel
    });

    const opacity = interpolate(spr, [0, 1], [0, 1]);
    const translateX = interpolate(spr, [0, 1], [-50, 0]);

    return (
        <div
            className="w-[1000px] flex flex-col justify-center"
            style={{
                opacity,
                transform: `translateX(${translateX}px)`
            }}
        >
            {subLabel && (
                <div className="flex items-center gap-4 text-white font-bold tracking-widest uppercase text-xl mb-6">
                    <Lucide.MapPin size={32} strokeWidth={3} />
                    {subLabel}
                </div>
            )}

            <h2
                className="text-8xl font-black text-white leading-[0.95] mb-8"
                style={{
                    textShadow: '0 10px 40px rgba(0,0,0,0.6)',
                    filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))'
                }}
            >
                {label}
            </h2>

            {description && (
                <p
                    className="text-4xl font-semibold text-slate-100 leading-relaxed max-w-3xl"
                    style={{ textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                >
                    {description}
                </p>
            )}
        </div>
    );
};
