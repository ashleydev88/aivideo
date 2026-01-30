import React from 'react';
import { BaseMotionBox } from './BaseMotionBox';
import * as Lucide from 'lucide-react';
import { MotionEdge } from '../../types/MotionGraph';

interface ProcessBoxProps {
    label: string;
    subLabel?: string;
    icon?: string;
    variant?: 'neutral' | 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'warning';
    delay?: number;
}

const getColor = (variant: string) => {
    switch (variant) {
        case 'positive': return '#22c55e';
        case 'negative': return '#ef4444';
        case 'warning': return '#f59e0b';
        case 'accent': return '#8b5cf6';
        case 'primary': return '#3b82f6';
        case 'secondary': return '#64748b';
        default: return '#94a3b8';
    }
};

export const ProcessBox: React.FC<ProcessBoxProps> = ({ label, subLabel, icon, variant = 'neutral', delay }) => {
    const color = getColor(variant);

    // Dynamic Icon
    const IconComponent = icon && (Lucide as any)[icon.charAt(0).toUpperCase() + icon.slice(1).replace(/-./g, x => x[1].toUpperCase())] || Lucide.Box;

    return (
        <BaseMotionBox delay={delay} className="min-w-[180px] p-0" enterEffect="scale">
            {/* Header / Icon Area */}
            <div className="h-2 w-full" style={{ backgroundColor: color }} />
            <div className="p-5 flex flex-col items-center text-center gap-3">
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: color }}
                >
                    <IconComponent size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{label}</h3>
                    {subLabel && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">{subLabel}</p>}
                </div>
            </div>
        </BaseMotionBox>
    );
};
