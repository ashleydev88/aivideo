import React from 'react';
import { icons } from 'lucide-react';
import { BaseMotionBox } from './BaseMotionBox';
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';

interface GridBoxProps extends MotionNodeData {
    delay: number;
}

export const GridBox: React.FC<GridBoxProps> = ({
    label,
    description,
    icon,
    variant = 'neutral',
    delay
}) => {
    // Dynamic icon lookup
    const IconComponent = icon && icons[icon as keyof typeof icons]
        ? icons[icon as keyof typeof icons]
        : icons.Square;

    const bgColors = {
        neutral: 'bg-white',
        primary: 'bg-blue-600 text-white',
        secondary: 'bg-slate-800 text-white',
        accent: 'bg-purple-600 text-white',
        positive: 'bg-emerald-600 text-white',
        negative: 'bg-rose-600 text-white',
        warning: 'bg-amber-500 text-white',
    };

    const isDark = variant !== 'neutral';

    return (
        <BaseMotionBox
            delay={delay}
            enterEffect="fade"
            className={cn(
                "w-[220px] h-[140px] p-4 flex flex-col justify-between rounded-xl shadow-md transition-shadow",
                bgColors[variant] || bgColors.neutral,
                variant === 'neutral' ? 'border border-slate-200' : 'border-transparent'
            )}
        >
            <div className="flex justify-between items-start">
                <IconComponent
                    size={28}
                    className={cn(isDark ? "text-white/80" : "text-slate-400")}
                />
            </div>

            <div>
                <h3 className={cn(
                    "font-bold text-lg leading-snug mb-1",
                    isDark ? "text-white" : "text-slate-800"
                )}>
                    {label}
                </h3>
                {description && (
                    <p className={cn(
                        "text-xs line-clamp-2",
                        isDark ? "text-white/70" : "text-slate-500"
                    )}>
                        {description}
                    </p>
                )}
            </div>
        </BaseMotionBox>
    );
};
