/**
 * PreviewMotionBox
 * 
 * Static preview equivalent of Remotion's BaseMotionBox.
 * Renders node cards without animation for slide preview.
 */
import React from 'react';
import parse from 'html-react-parser';
import * as Lucide from 'lucide-react';
import { getVariantColor } from '@/lib/types/MotionGraph';
import RichTextEditor from './RichTextEditor';

interface PreviewMotionBoxProps {
    label: string;
    subLabel?: string;
    description?: string;
    icon?: string;
    variant?: 'neutral' | 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'warning';
    className?: string;
    isEditable?: boolean;
    width?: number | string;
    height?: number | string;
    onUpdate?: (field: string, value: string) => void;
}

// Convert kebab-case icon name to PascalCase for Lucide
const getIconComponent = (iconName?: string) => {
    if (!iconName) return Lucide.Box;
    const pascalCase = iconName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    const icons = Lucide as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>>;
    return icons[pascalCase] || Lucide.Box;
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
    width,
    height,
}) => {
    const color = getVariantColor(variant);
    return (
        <div
            className={`bg-white rounded-3xl shadow-xl border-2 border-slate-300 overflow-hidden ${className}`}
            style={{
                minWidth: width || 280,
                width,
                height,
                boxSizing: 'border-box'
            }}
        >
            {/* Color accent bar */}
            <div className="h-3 w-full" style={{ backgroundColor: color }} />

            {/* Content */}
            <div className="p-5 flex flex-col items-center text-center gap-4">
                {/* Icon */}
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md mb-2"
                    style={{ backgroundColor: color }}
                >
                    {React.createElement(getIconComponent(icon), { size: 32, strokeWidth: 2.5 })}
                </div>

                {/* Text */}
                <div className="w-full">
                    {isEditable ? (
                        <div className="text-2xl font-black leading-tight mb-2 text-slate-800">
                            <RichTextEditor
                                value={label}
                                onChange={(value) => onUpdate?.('label', value)}
                                variant="minimal"
                            />
                        </div>
                    ) : (
                        <div className="font-black text-slate-800 text-2xl leading-tight mb-2">{parse(label)}</div>
                    )}

                    {subLabel && (
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{parse(subLabel)}</div>
                    )}

                    {(description || isEditable) && (
                        isEditable ? (
                            <div className="text-lg text-slate-500 mt-2 leading-relaxed">
                                <RichTextEditor
                                    value={description || ''}
                                    onChange={(value) => onUpdate?.('description', value)}
                                    variant="minimal"
                                />
                            </div>
                        ) : (
                            <div className="text-lg text-slate-500 mt-2 leading-relaxed">{parse(description || '')}</div>
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
                <div className="text-7xl font-black mb-4 tracking-tighter" style={{ color }}>
                    <RichTextEditor
                        value={String(value || label)}
                        onChange={(nextValue) => onUpdate?.(value ? 'value' : 'label', nextValue)}
                        variant="minimal"
                    />
                </div>
            ) : (
                <div className="text-7xl font-black mb-4 tracking-tighter" style={{ color }}>
                    {parse(String(value || label))}
                </div>
            )}

            {isEditable ? (
                <div className="text-3xl font-black text-slate-700">
                    <RichTextEditor
                        value={description || (value ? label : '')}
                        onChange={(nextValue) => onUpdate?.('description', nextValue)}
                        variant="minimal"
                    />
                </div>
            ) : (
                <div className="text-3xl font-black text-slate-700">
                    {parse(description || (value ? label : ''))}
                </div>
            )}
        </div>
    );
};
