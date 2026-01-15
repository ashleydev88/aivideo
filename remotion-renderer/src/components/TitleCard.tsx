import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export const TitleCard: React.FC<{
    title: string;
    subtitle?: string;
    accent_color?: string;
}> = ({ title, subtitle, accent_color = '#14b8a6' }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Fade in animation
    const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
        extrapolateRight: 'clamp',
    });

    const titleY = interpolate(frame, [0, fps * 0.5], [30, 0], {
        extrapolateRight: 'clamp',
    });

    const subtitleOpacity = interpolate(frame, [fps * 0.3, fps * 0.8], [0, 1], {
        extrapolateRight: 'clamp',
    });

    return (
        <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
                background: `linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)`,
            }}
        >
            {/* Decorative accent line */}
            <div
                className="w-24 h-1 mb-8 rounded-full"
                style={{
                    backgroundColor: accent_color,
                    opacity: opacity,
                }}
            />

            {/* Main Title */}
            <h1
                className="text-7xl font-bold text-white text-center px-16 leading-tight"
                style={{
                    opacity: opacity,
                    transform: `translateY(${titleY}px)`,
                    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
            >
                {title}
            </h1>

            {/* Subtitle (if provided) */}
            {subtitle && (
                <p
                    className="text-3xl text-slate-300 mt-6 text-center px-16"
                    style={{
                        opacity: subtitleOpacity,
                    }}
                >
                    {subtitle}
                </p>
            )}

            {/* Bottom accent line */}
            <div
                className="w-32 h-1 mt-12 rounded-full"
                style={{
                    backgroundColor: accent_color,
                    opacity: opacity,
                }}
            />
        </div>
    );
};
