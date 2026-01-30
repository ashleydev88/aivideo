import React from 'react';
import { BaseMotionBox } from './BaseMotionBox';
import * as Lucide from 'lucide-react';
import { cn } from '../../lib/utils';

interface ComparisonBoxProps {
    label: string;
    description?: string;
    icon?: string;
    variant?: 'neutral' | 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'warning';
    delay?: number;
    side?: 'left' | 'right';
}

export const ComparisonBox: React.FC<ComparisonBoxProps> = ({
    label,
    description,
    icon,
    variant = 'neutral',
    delay,
    side
}) => {
    const IconComponent = icon && (Lucide as any)[icon.charAt(0).toUpperCase() + icon.slice(1).replace(/-./g, x => x[1].toUpperCase())] || Lucide.FileText;

    return (
        <BaseMotionBox
            delay={delay}
            className={cn(
                "w-full max-w-[280px] p-6 text-left border-t-4",
                side === 'left' ? "rounded-tr-none" : side === 'right' ? "rounded-tl-none" : ""
            )}
            enterEffect="slide-up"
            style={{
                borderTopColor: variant === 'positive' ? '#22c55e' : variant === 'negative' ? '#ef4444' : '#cbd5e1'
            }}
        >
            <div className="flex items-start gap-4 mb-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <IconComponent size={24} />
                </div>
                <h3 className="font-black text-xl text-slate-800 leading-snug">{label}</h3>
            </div>
            {description && <p className="text-slate-500 text-sm leading-relaxed">{description}</p>}
        </BaseMotionBox>
    );
};
