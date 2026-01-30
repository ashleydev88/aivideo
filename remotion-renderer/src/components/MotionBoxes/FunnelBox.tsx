import React from 'react';
import { BaseMotionBox } from './BaseMotionBox';
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';

interface FunnelBoxProps extends MotionNodeData {
    delay: number;
    index: number;
    total: number;
}

export const FunnelBox: React.FC<FunnelBoxProps> = ({
    label,
    value,
    variant = 'primary',
    delay,
    index,
    total
}) => {
    // Calculate width percentage based on position (widest at top)
    // index 0 = 100%, index last = 40%
    const widthPercent = 100 - (index * (60 / Math.max(total - 1, 1)));

    const colors = {
        neutral: 'bg-slate-200 text-slate-700',
        primary: 'bg-blue-500 text-white',
        secondary: 'bg-indigo-500 text-white',
        accent: 'bg-violet-500 text-white',
        positive: 'bg-emerald-500 text-white',
        negative: 'bg-rose-500 text-white',
        warning: 'bg-amber-500 text-white',
    };

    return (
        <BaseMotionBox
            delay={delay}
            enterEffect="scale"
            className={cn(
                "h-[60px] flex items-center justify-between px-6 rounded-lg shadow-sm mx-auto mb-2",
                colors[variant] || colors.primary
            )}
            style={{
                width: `${widthPercent}%`,
                minWidth: '200px',
                maxWidth: '600px'
            }}
        >
            <span className="font-bold text-lg">{label}</span>
            {value && <span className="font-mono font-bold opacity-80">{value}</span>}
        </BaseMotionBox>
    );
};
