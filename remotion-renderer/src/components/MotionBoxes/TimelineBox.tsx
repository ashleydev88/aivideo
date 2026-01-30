import React from 'react';
import { icons } from 'lucide-react';
import { BaseMotionBox } from './BaseMotionBox';
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';

interface TimelineBoxProps extends MotionNodeData {
    delay: number;
    index: number;
}

export const TimelineBox: React.FC<TimelineBoxProps> = ({
    label,
    subLabel,
    description,
    icon,
    variant = 'neutral',
    delay,
    index
}) => {
    const IconComponent = icon && icons[icon as keyof typeof icons]
        ? icons[icon as keyof typeof icons]
        : icons.CircleDot;

    return (
        <div className="flex flex-col items-center relative">
            {/* Connector Dot */}
            <div className={cn(
                "w-6 h-6 rounded-full border-4 z-10 mb-4 bg-white",
                variant === 'neutral' ? "border-slate-300" : "border-blue-500"
            )} />

            {/* The Card */}
            <BaseMotionBox
                delay={delay}
                enterEffect="slide-up"
                className={cn(
                    "w-[200px] p-4 rounded-lg shadow-lg border-l-4 text-left",
                    "bg-white"
                )}
                style={{
                    borderLeftColor: variant === 'neutral' ? '#cbd5e1' : '#3b82f6'
                }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <IconComponent size={18} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Step {index + 1}
                    </span>
                </div>
                <h4 className="font-bold text-slate-800 text-md leading-tight mb-2">
                    {label}
                </h4>
                {description && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                        {description}
                    </p>
                )}
            </BaseMotionBox>
        </div>
    );
};
