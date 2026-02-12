import React from 'react';
import parse from 'html-react-parser';
import * as Lucide from 'lucide-react';

interface ChartItem {
    label: string;
    description?: string;
    icon?: string;
    color_intent?: 'primary' | 'secondary' | 'accent' | 'danger' | 'success' | 'warning';
}

interface ChartData {
    title: string;
    type: 'process' | 'list' | 'grid' | 'comparison' | 'statistic' | 'pyramid' | 'cycle';
    items: ChartItem[];
}

const getColor = (intent: string | undefined, accent: string) => {
    switch (intent) {
        case 'danger': return '#ef4444';
        case 'success': return '#22c55e';
        case 'warning': return '#f59e0b';
        case 'accent': return '#8b5cf6';
        case 'secondary': return '#64748b';
        default: return accent || '#14b8a6';
    }
};

const IconWrapper: React.FC<{ name: string; color: string; size?: number }> = ({ name, color, size = 32 }) => {
    // Dynamic icon lookup with fallback
    const iconName = name ? (name.charAt(0).toUpperCase() + name.slice(1).replace(/-./g, x => x[1].toUpperCase())) : 'Box';
    const icons = Lucide as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>>;
    const IconComponent = icons[iconName] || Lucide.Box;
    return <IconComponent size={size} color={color} strokeWidth={2.5} />;
};

export const ChartRenderer: React.FC<{
    data: ChartData;
    title?: string;
    accent_color?: string;
    custom_bg_color?: string;
    custom_text_color?: string;
}> = ({ data, title, accent_color = '#14b8a6', custom_bg_color, custom_text_color }) => {

    if (!data || !data.items) return null;

    // Static values instead of animations
    const titleOpacity = 1;
    const titleScale = 1;
    const finalOpacity = 1;
    const finalScale = 1;

    const renderItems = () => {
        switch (data.type) {
            case 'process':
                return (
                    <div className="flex flex-row items-center justify-center gap-6 w-full px-12">
                        {data.items.map((item, i) => {
                            const color = getColor(item.color_intent, accent_color);

                            return (
                                <React.Fragment key={i}>
                                    {i > 0 && (
                                        <div className="flex-shrink-0" style={{ opacity: finalOpacity }}>
                                            <Lucide.ArrowRight size={40} color={custom_text_color ? `${custom_text_color}cc` : "#cbd5e1"} strokeWidth={3} />
                                        </div>
                                    )}
                                    <div
                                        className="flex-1 bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border-b-8 flex flex-col items-center text-center"
                                        style={{
                                            opacity: finalOpacity,
                                            transform: `scale(${finalScale})`,
                                            borderColor: color,
                                        }}
                                    >
                                        <div className="mb-6 p-4 rounded-2xl bg-slate-50" style={{ backgroundColor: `${color}15` }}>
                                            <IconWrapper name={item.icon || 'box'} color={color} size={48} />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-800 mb-3" style={{ color: custom_text_color || '#1e293b' }}>{item.label}</h3>
                                        {item.description && <p className="text-slate-500 text-xl font-medium leading-tight" style={{ color: custom_text_color ? `${custom_text_color}cc` : '#64748b' }}>{item.description}</p>}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                );

            case 'grid':
                return (
                    <div className="grid grid-cols-2 gap-8 w-full max-w-5xl px-8">
                        {data.items.map((item, i) => {
                            const color = getColor(item.color_intent, accent_color);

                            return (
                                <div
                                    key={i}
                                    className="bg-white p-8 rounded-[2.5rem] shadow-xl flex items-start gap-6 border-l-8"
                                    style={{
                                        opacity: finalOpacity,
                                        transform: `translateX(0px)`, // Removed animation
                                        borderLeftColor: color
                                    }}
                                >
                                    <div className="p-4 rounded-2xl" style={{ backgroundColor: `${color}15` }}>
                                        <IconWrapper name={item.icon || 'layers'} color={color} size={40} />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold text-slate-800 mb-2" style={{ color: custom_text_color || '#1e293b' }}>{item.label}</h4>
                                        <p className="text-slate-500 text-lg font-medium" style={{ color: custom_text_color ? `${custom_text_color}cc` : '#64748b' }}>{item.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'statistic':
                return (
                    <div className="flex flex-row gap-12 justify-center w-full">
                        {data.items.map((item, i) => {
                            const color = getColor(item.color_intent, accent_color);
                            return (
                                <div
                                    key={i}
                                    className="bg-white/80 p-12 rounded-[3.5rem] shadow-2xl text-center min-w-[350px] border-t-8"
                                    style={{
                                        opacity: finalOpacity,
                                        transform: `scale(1)`,
                                        borderTopColor: color
                                    }}
                                >
                                    <div className="text-8xl font-black mb-4 tracking-tighter" style={{ color }}>
                                        {item.label}
                                    </div>
                                    <div className="text-3xl font-bold text-slate-700 tracking-tight" style={{ color: custom_text_color || '#334155' }}>
                                        {item.description}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'cycle':
                return (
                    <div className="relative w-[600px] h-[600px] flex items-center justify-center">
                        {/* Circle path decoration */}
                        <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
                            <circle
                                cx="300" cy="300" r="220"
                                fill="none" stroke={custom_text_color ? `${custom_text_color}40` : "#e2e8f0"} strokeWidth="4" strokeDasharray="10 10"
                                style={{ opacity: titleOpacity }}
                            />
                        </svg>

                        {data.items.map((item, i) => {
                            const count = data.items.length;
                            const angle = (i / count) * 2 * Math.PI;
                            const x = Math.cos(angle) * 220;
                            const y = Math.sin(angle) * 220;
                            const color = getColor(item.color_intent, accent_color);

                            return (
                                <div
                                    key={i}
                                    className="absolute bg-white p-6 rounded-2xl shadow-lg border-2 flex flex-col items-center w-48 text-center"
                                    style={{
                                        left: 300 + x - 96,
                                        top: 300 + y - 60,
                                        opacity: finalOpacity,
                                        transform: `scale(1)`,
                                        borderColor: color
                                    }}
                                >
                                    <IconWrapper name={item.icon || 'refresh-cw'} color={color} size={28} />
                                    <span className="mt-2 font-bold text-slate-800" style={{ color: custom_text_color || '#1e293b' }}>{item.label}</span>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'comparison':
                return (
                    <div className="flex flex-row items-stretch justify-center gap-12 w-full max-w-6xl px-8">
                        {data.items.slice(0, 2).map((item, i) => {
                            const color = getColor(item.color_intent, i === 0 ? '#3b82f6' : '#ef4444');
                            return (
                                <React.Fragment key={i}>
                                    {i === 1 && (
                                        <div className="flex items-center justify-center">
                                            <div
                                                className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center text-3xl font-black shadow-xl z-10"
                                                style={{ opacity: finalOpacity, transform: `scale(1)` }}
                                            >
                                                VS
                                            </div>
                                        </div>
                                    )}
                                    <div
                                        className="flex-1 bg-white p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center text-center border-t-[12px]"
                                        style={{
                                            opacity: finalOpacity,
                                            transform: `translateX(0px)`,
                                            borderTopColor: color
                                        }}
                                    >
                                        <div className="mb-8 p-6 rounded-3xl" style={{ backgroundColor: `${color}15` }}>
                                            <IconWrapper name={item.icon || (i === 0 ? 'check-circle' : 'x-circle')} color={color} size={56} />
                                        </div>
                                        <h3 className="text-4xl font-black text-slate-800 mb-4" style={{ color: custom_text_color || '#1e293b' }}>{item.label}</h3>
                                        <p className="text-slate-500 text-xl font-medium leading-relaxed" style={{ color: custom_text_color ? `${custom_text_color}cc` : '#64748b' }}>{item.description}</p>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                );

            case 'pyramid':
                return (
                    <div className="flex flex-col items-center justify-center w-full max-w-4xl gap-4">
                        {data.items.map((item, i) => {
                            const width = 100 - (i * 15);
                            const color = getColor(item.color_intent, accent_color);
                            return (
                                <div
                                    key={i}
                                    className="h-24 flex items-center justify-center bg-white shadow-lg rounded-2xl border-l-8 overflow-hidden relative"
                                    style={{
                                        width: `${width}%`,
                                        opacity: finalOpacity,
                                        transform: `scaleX(1)`,
                                        borderLeftColor: color
                                    }}
                                >
                                    <div className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-center bg-slate-50" style={{ backgroundColor: `${color}10` }}>
                                        <IconWrapper name={item.icon || 'triangle'} color={color} size={32} />
                                    </div>
                                    <div className="pl-28 pr-8 text-center">
                                        <h4 className="text-2xl font-bold text-slate-800 uppercase tracking-wider" style={{ color: custom_text_color || '#1e293b' }}>{item.label}</h4>
                                        <p className="text-slate-500 font-bold truncate" style={{ color: custom_text_color ? `${custom_text_color}cc` : '#64748b' }}>{item.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );

            default: // Fallback to list
                return (
                    <div className="flex flex-col gap-4 w-full max-w-3xl">
                        {data.items.map((item, i) => {
                            const color = getColor(item.color_intent, accent_color);
                            return (
                                <div
                                    key={i}
                                    className="bg-white/90 p-6 rounded-2xl shadow-md flex items-center gap-6 border-r-8"
                                    style={{
                                        opacity: finalOpacity,
                                        transform: `translateX(0px)`,
                                        borderRightColor: color
                                    }}
                                >
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black" style={{ backgroundColor: color }}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-2xl font-bold text-slate-800" style={{ color: custom_text_color || '#1e293b' }}>{item.label}</h4>
                                        {item.description && <p className="text-slate-500 font-medium" style={{ color: custom_text_color ? `${custom_text_color}cc` : '#64748b' }}>{item.description}</p>}
                                    </div>
                                    <IconWrapper name={item.icon || 'check-circle'} color={color} size={32} />
                                </div>
                            );
                        })}
                    </div>
                );
        }
    };

    return (
        <div
            className="flex flex-col items-center justify-center p-20 w-[1920px] h-[1080px] absolute inset-0"
            style={{ backgroundColor: custom_bg_color || '#f8fafc' }}
        >
            <div
                className="text-6xl font-black mb-20 tracking-tight uppercase text-center max-w-5xl mx-auto"
                style={{
                    opacity: titleOpacity,
                    transform: `scale(${titleScale}) translateY(0px)`,
                    color: custom_text_color || '#0f172a'
                }}
            >
                {(() => {
                    const textContent = title || data.title;
                    const isHtml = /<[a-z][\s\S]*>/i.test(textContent);
                    if (isHtml) {
                        // Strip p tags if they are the only thing, or just parse
                        // Chart titles should be largely unformatted h2s, but the editor wraps in p.
                        // We can strip outer p if we want, or just let prose handle it?
                        // Ideally we want to inherit the text-6xl font black.
                        // Tiptap puts everything in <p>.
                        return (
                            <div className="prose prose-2xl max-w-none dark:prose-invert">
                                <style>{`
                                    h1, h2, h3, p { margin: 0; font-size: inherit; font-weight: inherit; line-height: 1.1; display: inline; }
                                    strong { color: ${accent_color}; }
                                `}</style>
                                {parse(textContent)}
                            </div>
                        );
                    }
                    return textContent;
                })()}
                <div className="h-2 w-32 mt-4 mx-auto rounded-full" style={{ backgroundColor: accent_color }} />
            </div>

            <div className="w-full flex justify-center items-center">
                {renderItems()}
            </div>
        </div>
    );
};
