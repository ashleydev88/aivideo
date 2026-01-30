import React from 'react';
import { BaseMotionBox } from './BaseMotionBox';
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';

interface MetaphorBoxProps extends MotionNodeData {
    delay: number;
    index: number;
    total: number;
}

export const MetaphorBox: React.FC<MetaphorBoxProps> = ({
    label,
    description,
    variant = 'neutral',
    delay,
    index,
    total
}) => {
    // Assumption: First half of nodes are "Surface" (Visible), Second half are "Deep" (Hidden)
    const isSurface = index < total / 2;

    return (
        <BaseMotionBox
            delay={delay}
            enterEffect={isSurface ? "slide-down" : "slide-up"}
            className={cn(
                "w-[300px] p-4 flex items-center gap-4 rounded-lg shadow-md border-l-8 backdrop-blur-sm",
                isSurface
                    ? "bg-sky-100/90 border-sky-400 mb-8"
                    : "bg-indigo-900/90 border-indigo-500 text-white mt-2"
            )}
        >
            <div className="flex-1">
                <div className={cn(
                    "text-xs font-bold uppercase tracking-widest mb-1",
                    isSurface ? "text-sky-600" : "text-indigo-300"
                )}>
                    {isSurface ? "Surface Level" : "Root Cause"}
                </div>
                <h3 className={cn("font-bold text-lg", isSurface ? "text-slate-800" : "text-white")}>
                    {label}
                </h3>
                {description && <p className={cn("text-xs mt-1", isSurface ? "text-slate-600" : "text-indigo-200")}>{description}</p>}
            </div>
        </BaseMotionBox>
    );
};
