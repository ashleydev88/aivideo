import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import * as Lucide from 'lucide-react';
import { MotionNodeData } from '../../types/MotionGraph';

interface DocumentAnchorBoxProps extends MotionNodeData {
    delay?: number;
}

export const DocumentAnchorBox: React.FC<DocumentAnchorBoxProps> = ({
    label,
    subLabel,
    description,
    variant = 'neutral',
    delay = 0,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const spr = spring({
        frame: frame - delay,
        fps,
        config: { damping: 12, stiffness: 100 } // Slight bounce
    });

    const opacity = interpolate(spr, [0, 1], [0, 1]);
    const scale = interpolate(spr, [0, 1], [0.9, 1]);
    const translateY = interpolate(spr, [0, 1], [20, 0]);

    // Color mapping
    const getColor = (v: string) => {
        switch (v) {
            case 'primary': return '#0ea5e9'; // sky-500
            case 'secondary': return '#64748b'; // slate-500
            case 'accent': return '#8b5cf6'; // violet-500
            case 'negative': return '#ef4444'; // red-500
            case 'positive': return '#22c55e'; // green-500
            case 'warning': return '#f59e0b'; // amber-500
            default: return '#0f172a'; // slate-900
        }
    };

    const color = getColor(variant);

    return (
        <div
            className="flex items-center justify-center w-[900px] h-[600px] bg-transparent" // Fixed size container for positioning
            style={{
                opacity,
                transform: `scale(${scale}) translateY(${translateY}px)`
            }}
        >
            <div
                className="relative bg-white rounded-3xl shadow-2xl p-16 border-l-[16px] w-full"
                style={{ borderColor: color }}
            >
                <div className="absolute -top-10 -left-10 bg-white p-4 rounded-full shadow-lg">
                    <Lucide.Quote size={64} color={color} fill={color} className="opacity-20" />
                </div>

                <div className="space-y-8 relative z-10">
                    <blockquote className="font-black text-5xl text-slate-800 leading-tight">
                        "{label}"
                    </blockquote>

                    <div className="flex items-center gap-4 border-t pt-8" style={{ borderColor: `${color}40` }}>
                        <div className="w-16 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <div>
                            <cite className="block font-bold text-slate-600 text-2xl not-italic">
                                {subLabel || 'Source'}
                            </cite>
                            {description && (
                                <span className="text-slate-400 text-xl font-medium">
                                    {description}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
