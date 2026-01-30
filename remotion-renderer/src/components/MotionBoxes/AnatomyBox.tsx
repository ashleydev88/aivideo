import React from 'react';
import { BaseMotionBox } from './BaseMotionBox';
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';
import { icons } from 'lucide-react';

interface AnatomyBoxProps extends MotionNodeData {
    delay: number;
}

export const AnatomyBox: React.FC<AnatomyBoxProps> = ({
    label,
    subLabel,
    icon,
    variant = 'neutral',
    delay
}) => {
    // In a real AnatomyBox, we'd expect an 'image' url in data, and maybe coordinates.
    // For now, this box represents a "Label" that points to something.

    const isRightAligned = variant === 'secondary'; // Just a heuristic
    const IconComponent = icon && icons[icon as keyof typeof icons]
        ? icons[icon as keyof typeof icons]
        : icons.Target;

    return (
        <BaseMotionBox
            delay={delay}
            enterEffect="fade"
            className="flex items-center gap-0 group"
            style={{ flexDirection: isRightAligned ? 'row-reverse' : 'row' }}
        >
            {/* The Label */}
            <div className={cn(
                "bg-white/90 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-lg max-w-[200px]",
                isRightAligned ? "mr-4" : "ml-4"
            )}>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-1 mb-1">
                    <IconComponent size={14} className="text-red-500" />
                    <span className="text-xs font-bold uppercase text-slate-500">{subLabel || 'Part'}</span>
                </div>
                <p className="font-bold text-slate-800 leading-tight">{label}</p>
            </div>

            {/* The Connector Line */}
            <div className="w-12 h-[2px] bg-red-500 relative">
                <div className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full",
                    isRightAligned ? "right-[-4px]" : "left-[-4px]" // Dot at the object end
                )} />
            </div>
        </BaseMotionBox>
    );
};
