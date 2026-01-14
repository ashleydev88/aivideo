import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

interface ChartItem {
    label: string;
    description?: string;
}

interface ChartData {
    title: string;
    type: 'process' | 'list';
    items: ChartItem[];
}

export const Chart: React.FC<{
    data: ChartData;
    accent_color?: string;
}> = ({ data, accent_color }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const durationInSeconds = 5; // Assume 5s reveal time for now, or drive by props

    // Simple stagger effect
    const revealFrame = (index: number) => index * (fps * 0.5);

    if (!data) return null;

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-16">
            <h2 className="text-5xl font-bold mb-16 text-slate-800 tracking-tight">
                {data.title}
            </h2>

            <div className={`w-full max-w-6xl ${data.type === 'process' ? 'flex flex-row items-start justify-center gap-4' : 'flex flex-col gap-6'}`}>
                {data.items.map((item, i) => {
                    const startFrame = revealFrame(i);
                    const opacity = Math.min(1, Math.max(0, (frame - startFrame) / 20));
                    const translateY = (1 - opacity) * 20;

                    return (
                        <React.Fragment key={i}>
                            {/* Process Arrow (except first) */}
                            {data.type === 'process' && i > 0 && (
                                <div
                                    className="text-4xl text-slate-300 mt-8"
                                    style={{ opacity: opacity, transform: `translateX(${translateY * -1}px)` }}
                                >
                                    →
                                </div>
                            )}

                            {/* Item Card */}
                            <div
                                className="flex-1 bg-white p-8 rounded-xl shadow-lg border-2"
                                style={{
                                    borderColor: accent_color || '#14b8a6',
                                    opacity: opacity,
                                    transform: `translateY(${translateY}px)`
                                }}
                            >
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                                    {item.label}
                                </h3>
                                {item.description && (
                                    <p className="text-slate-600 text-lg leading-relaxed">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
