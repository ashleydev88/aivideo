import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import parse from 'html-react-parser';

export const TitleCard: React.FC<{
    title: string;
    subtitle?: string;
    accent_color?: string;
    custom_bg_color?: string;
    custom_text_color?: string;
}> = ({ title, subtitle, accent_color = '#14b8a6', custom_bg_color, custom_text_color }) => {
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

    // Debug: Log what we're rendering
    console.log('[TitleCard] Rendering with title:', title, 'accent:', accent_color);

    // Safety check for empty title
    const displayTitle = title || 'Welcome';

    // Detect HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(title);

    return (
        <div
            className="absolute inset-0 flex flex-col items-center justify-center p-16"
            style={{
                backgroundColor: custom_bg_color || '#ffffff',
            }}
        >
            {isHtml ? (
                // HTML / Rich Text Render
                <div
                    className="prose prose-2xl max-w-none text-center flex flex-col items-center justify-center h-full w-full"
                    style={{
                        opacity,
                        color: custom_text_color || '#1e293b'
                    }}
                >
                    <style>{`
                        h1 { font-weight: 800; line-height: 1.1; margin-bottom: 0.5em; font-size: 4em; }
                        p { opacity: 0.9; font-size: 1.5em; margin-bottom: 1em; }
                        strong { color: ${accent_color}; }
                        ul { list-style-type: none; padding: 0; }
                     `}</style>
                    {parse(title)}
                </div>
            ) : (
                // Plain Text Render (Legacy)
                <>
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
                        style={{
                            fontSize: '100px',
                            fontWeight: 900,
                            color: custom_text_color || '#1e293b',
                            textAlign: 'center',
                            padding: '0 64px',
                            lineHeight: 1.1,
                            opacity: opacity,
                            transform: `translateY(${titleY}px)`,
                        }}
                    >
                        {displayTitle}
                    </h1>

                    {/* Subtitle (if provided) */}
                    {subtitle && (
                        <p
                            style={{
                                fontSize: '24px',
                                color: custom_text_color ? `${custom_text_color}cc` : '#64748b',
                                marginTop: '24px',
                                textAlign: 'center',
                                padding: '0 64px',
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
                </>
            )}
        </div >
    );
};
