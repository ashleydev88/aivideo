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
    isEditable?: boolean;
    onUpdate?: (field: string, value: string) => void;
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
    isEditable = false,
    onUpdate,
}) => {
    const color = getVariantColor(variant);
    const IconComponent = getIconComponent(icon);

    return (
        <div
            className={`bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden ${className}`}
            style={{ minWidth: 280 }}
        >
            {/* Color accent bar */}
            <div className="h-3 w-full" style={{ backgroundColor: color }} />

            {/* Content */}
            <div className="p-8 flex flex-col items-center text-center gap-4">
                {/* Icon */}
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md mb-2"
                    style={{ backgroundColor: color }}
                >
                    <IconComponent size={32} strokeWidth={2.5} />
                </div>

                {/* Text */}
                <div className="w-full">
                    {isEditable ? (
                        <input
                            value={label}
                            onChange={(e) => onUpdate?.('label', e.target.value)}
                            className="font-black text-slate-800 text-2xl leading-tight mb-1 bg-transparent text-center w-full focus:bg-slate-50 focus:ring-1 focus:ring-slate-300 rounded outline-none"
                        />
                    ) : (
                        <h3 className="font-black text-slate-800 text-2xl leading-tight mb-1">{label}</h3>
                    )}

                    {subLabel && (
                        isEditable ? (
                            <input
                                value={subLabel}
                                onChange={(e) => onUpdate?.('subLabel', e.target.value)}
                                className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1 bg-transparent text-center w-full focus:bg-slate-50 focus:ring-1 focus:ring-slate-300 rounded outline-none"
                            />
                        ) : (
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1">
                                {subLabel}
                            </p>
                        )
                    )}

                    {(description || isEditable) && (
                        isEditable ? (
                            <textarea
                                value={description || ''}
                                onChange={(e) => onUpdate?.('description', e.target.value)}
                                className="text-lg text-slate-500 mt-2 leading-relaxed bg-transparent text-center w-full focus:bg-slate-50 focus:ring-1 focus:ring-slate-300 rounded outline-none resize-none"
                                rows={3}
                                placeholder="Description..."
                            />
                        ) : (
                            <p className="text-lg text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                                {description}
                            </p>
                        )
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
    isEditable = false,
    onUpdate,
}) => {
    const color = getVariantColor(variant);

    return (
        <div className="bg-white rounded-[2rem] shadow-2xl p-10 text-center min-w-[320px] border-t-8" style={{ borderTopColor: color }}>
            {isEditable ? (
                <input
                    value={value || label}
                    onChange={(e) => onUpdate?.(value ? 'value' : 'label', e.target.value)}
                    className="text-7xl font-black mb-4 tracking-tighter bg-transparent text-center w-full focus:bg-slate-50 focus:ring-1 focus:ring-slate-300 rounded outline-none"
                    style={{ color }}
                />
            ) : (
                <div className="text-7xl font-black mb-4 tracking-tighter" style={{ color }}>
                    {value || label}
                </div>
            )}

            {isEditable ? (
                <input
                    value={description || (value ? label : '')}
                    onChange={(e) => onUpdate?.('description', e.target.value)} // Note: logic for label fallback is tricky here, simplified
                    className="text-3xl font-black text-slate-700 bg-transparent text-center w-full focus:bg-slate-50 focus:ring-1 focus:ring-slate-300 rounded outline-none"
                />
            ) : (
                <div className="text-3xl font-black text-slate-700">
                    {description || (value ? label : '')}
                </div>
            )}
        </div>
    );
};
