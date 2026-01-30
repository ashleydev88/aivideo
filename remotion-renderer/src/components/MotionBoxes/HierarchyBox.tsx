import React from 'react';
import { icons } from 'lucide-react';
import { BaseMotionBox } from './BaseMotionBox';
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';

interface HierarchyBoxProps extends MotionNodeData {
    delay: number;
}

export const HierarchyBox: React.FC<HierarchyBoxProps> = ({
    label,
    subLabel,
    icon,
    variant = 'neutral',
    delay
}) => {
    // Dynamic icon lookup
    const IconComponent = icon && icons[icon as keyof typeof icons]
        ? icons[icon as keyof typeof icons]
        : icons.Circle;

    // Variant styles for the border/accent
    const variantStyles = {
        neutral: 'border-slate-200 bg-white',
        primary: 'border-blue-500 bg-blue-50',
        secondary: 'border-slate-500 bg-slate-50',
        accent: 'border-violet-500 bg-violet-50',
        positive: 'border-green-500 bg-green-50',
        negative: 'border-red-500 bg-red-50',
        warning: 'border-amber-500 bg-amber-50',
    };

    return (
        <BaseMotionBox
            delay={delay}
            enterEffect="scale"
            className={cn(
                "w-[200px] p-3 text-center border-2 rounded-xl flex flex-col items-center gap-2 shadow-sm",
                variantStyles[variant] || variantStyles.neutral
            )}
        >
            <div className={cn(
                "p-2 rounded-full",
                variant === 'neutral' ? "bg-slate-100 text-slate-600" : "bg-white/50 text-current"
            )}>
                <IconComponent size={20} className="opacity-80" />
            </div>

            <div className="flex flex-col">
                <h4 className="font-bold text-slate-800 text-sm leading-tight">
                    {label}
                </h4>
                {subLabel && (
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">
                        {subLabel}
                    </span>
                )}
            </div>
        </BaseMotionBox>
    );
};
