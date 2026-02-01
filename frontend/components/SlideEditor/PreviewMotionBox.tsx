/**
 * PreviewMotionBox
 * 
 * Static preview equivalent of Remotion's BaseMotionBox.
 * Renders node cards without animation for slide preview.
 */
import React from 'react';
import * as Lucide from 'lucide-react';
import { getVariantColor } from '@/lib/types/MotionGraph';

interface PreviewMotionBoxProps {
    label: string;
    subLabel?: string;
    description?: string;
    icon?: string;
    variant?: 'neutral' | 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'warning';
    className?: string;
}

// Convert kebab-case icon name to PascalCase for Lucide
const getIconComponent = (iconName?: string) => {
    if (!iconName) return Lucide.Box;
    const pascalCase = iconName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    return (Lucide as any)[pascalCase] || Lucide.Box;
};

export const PreviewMotionBox: React.FC<PreviewMotionBoxProps> = ({
    label,
    subLabel,
    description,
    icon,
    variant = 'neutral',
    className = '',
}) => {
    const color = getVariantColor(variant);
    const IconComponent = getIconComponent(icon);

    return (
        <div
            className={`bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden ${className}`}
            style={{ minWidth: 180 }}
        >
            {/* Color accent bar */}
            <div className="h-2 w-full" style={{ backgroundColor: color }} />

            {/* Content */}
            <div className="p-4 flex flex-col items-center text-center gap-2">
                {/* Icon */}
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: color }}
                >
                    <IconComponent size={20} strokeWidth={2.5} />
                </div>

                {/* Text */}
                <div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight">{label}</h3>
                    {subLabel && (
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
                            {subLabel}
                        </p>
                    )}
                    {description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * PreviewStatBox - For statistic archetype nodes
 */
export const PreviewStatBox: React.FC<PreviewMotionBoxProps & { value?: string | number }> = ({
    label,
    description,
    value,
    variant = 'primary',
}) => {
    const color = getVariantColor(variant);

    return (
        <div className="bg-white rounded-3xl shadow-xl p-6 text-center min-w-[200px] border-t-4" style={{ borderTopColor: color }}>
            <div className="text-5xl font-black mb-2 tracking-tighter" style={{ color }}>
                {value || label}
            </div>
            <div className="text-lg font-bold text-slate-600">
                {description || (value ? label : '')}
            </div>
        </div>
    );
};
