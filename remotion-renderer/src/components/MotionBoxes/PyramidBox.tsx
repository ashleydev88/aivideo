import React from 'react';
import { BaseMotionBox } from './BaseMotionBox';
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';

interface PyramidBoxProps extends MotionNodeData {
    delay: number;
    index: number;
    total: number;
}

export const PyramidBox: React.FC<PyramidBoxProps> = ({
    label,
    description,
    variant = 'accent',
    delay,
    index,
    total
}) => {
    // Width logic: Widest at bottom (last index), narrowest at top (index 0)
    // Pyramid usually implies hierarchy where index 0 is TOP.
    // So index 0 = narrow, index last = wide.
    const widthPercent = 30 + (index * (70 / Math.max(total - 1, 1)));

    return (
        <BaseMotionBox
            delay={delay}
            enterEffect="slide-up"
            className={cn(
                "h-[80px] flex flex-col items-center justify-center p-2 rounded-md shadow-md mx-auto mb-1 border-b-2 border-black/10",
                "bg-gradient-to-r from-amber-400 to-orange-500 text-white"
            )}
            style={{
                width: `${widthPercent}%`,
                minWidth: '150px',
                maxWidth: '600px'
            }}
        >
            <span className="font-bold text-lg md:text-xl drop-shadow-sm">{label}</span>
            {description && <span className="text-xs opacity-90">{description}</span>}
        </BaseMotionBox>
    );
};
