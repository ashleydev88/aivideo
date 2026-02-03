import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import parse from 'html-react-parser';
import { AutoFitText } from './AutoFitText';

interface Alignment {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
}

interface Word {
    text: string;
    start: number;
    end: number;
}

interface KineticEvent {
    text: string;
    trigger_word: string;
    start_ms: number;
    style: 'header' | 'bullet' | 'emphasis' | 'stat';
}

const processAlignment = (alignment: Alignment): Word[] => {
    if (!alignment || !alignment.characters) return [];

    const words: Word[] = [];
    let currentWord = "";
    let start = -1;

    for (let i = 0; i < alignment.characters.length; i++) {
        const char = alignment.characters[i];
        const tStart = alignment.character_start_times_seconds[i];
        const tEnd = alignment.character_end_times_seconds[i];

        if (start === -1) start = tStart;

        if (char === " ") {
            if (currentWord) {
                words.push({ text: currentWord, start, end: tEnd });
                currentWord = "";
                start = -1;
            }
        } else {
            currentWord += char;
        }
    }
    // Last word
    if (currentWord) {
        words.push({ text: currentWord, start, end: alignment.character_end_times_seconds[alignment.characters.length - 1] });
    }
    return words;
};

// Style mapping for kinetic events
const getEventStyle = (style: KineticEvent['style'], accent: string, custom_text: string | undefined) => {
    const baseColor = custom_text || '#1e293b';
    switch (style) {
        case 'header':
            return { fontSize: '4rem', fontWeight: 'bold', color: baseColor };
        case 'bullet':
            return { fontSize: '2.5rem', fontWeight: 'normal', color: custom_text || '#334155' };
        case 'emphasis':
            return { fontSize: '3rem', fontWeight: 'bold', color: accent, textTransform: 'uppercase' as const };
        case 'stat':
            return { fontSize: '5rem', fontWeight: 'bold', color: accent };
        default:
            return { fontSize: '3rem', fontWeight: 'bold', color: baseColor };
    }
};

export const KineticText: React.FC<{
    text: string;
    timestamps: Alignment;
    accent_color?: string;
    fullScreen?: boolean;
    kinetic_events?: KineticEvent[];
    custom_bg_color?: string;
    custom_text_color?: string;
}> = ({ text, timestamps, accent_color = '#14b8a6', fullScreen = true, kinetic_events, custom_bg_color, custom_text_color }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const currentTime = frame / fps;

    // Detect HTML Content
    const isHtml = /<[a-z][\s\S]*>/i.test(text);

    // HTML RENDERER (Rich Text)
    if (isHtml) {
        const containerClass = fullScreen
            ? "absolute inset-0 flex flex-col items-center justify-center p-16 overflow-hidden"
            : "w-full h-full flex flex-col items-center justify-center p-8 overflow-hidden";

        // Simple Fade In / Slide Up
        const opacity = Math.min(1, frame / 15);
        const translateY = interpolate(frame, [0, 15], [20, 0], { extrapolateRight: 'clamp' });

        return (
            <div
                className={containerClass}
                style={{
                    backgroundColor: fullScreen && custom_bg_color ? custom_bg_color : undefined,
                    opacity,
                    transform: `translateY(${translateY}px)`
                }}
            >
                <AutoFitText className="items-center justify-center origin-center">
                    <div
                        className="prose prose-xl max-w-none text-center"
                        style={{ color: custom_text_color || '#1e293b' }}
                    >
                        {/* We apply basic styles to overrides, but Tiptap output should be standard HTML elements */}
                        {/* You might need a global CSS to style h1, ul, li etc if Tailwind prose isn't enough or installed */}
                        <style>{`
                            h1 { font-weight: 900; font-size: 3.75rem; line-height: 1; margin-bottom: 0.5rem; text-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                            h2 { font-weight: 700; font-size: 1.5rem; line-height: 1.25; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
                            p { font-weight: 600; font-size: 1.5rem; line-height: 1.625; margin-bottom: 0.5rem; }
                            ul { list-style-type: disc; text-align: left; padding-left: 1.5em; }
                            li { margin-bottom: 0.5em; font-size: 1.25rem; }
                            strong { color: ${accent_color}; }
                         `}</style>
                        {parse(text)}
                    </div>
                </AutoFitText>
            </div>
        );
    }

    // EVENT-BASED KINETIC TEXT (Legacy AI Generated)
    if (kinetic_events && kinetic_events.length > 0) {
        const containerClass = fullScreen
            ? "absolute inset-0 flex flex-col items-center justify-center p-16 gap-6"
            : "w-full h-full flex flex-col items-center justify-center p-8 gap-4";

        return (
            <div
                className={containerClass}
                style={{ backgroundColor: fullScreen && custom_bg_color ? custom_bg_color : undefined }}
            >
                {kinetic_events.map((event, i) => {
                    const eventStartFrame = (event.start_ms / 1000) * fps;
                    const isVisible = frame >= eventStartFrame;

                    // Pop animation using spring
                    const popProgress = spring({
                        frame: frame - eventStartFrame,
                        fps,
                        config: {
                            damping: 12,
                            stiffness: 200,
                            mass: 0.5,
                        },
                    });

                    const scale = isVisible ? interpolate(popProgress, [0, 1], [0.5, 1]) : 0;
                    const opacity = isVisible ? interpolate(popProgress, [0, 1], [0, 1]) : 0;

                    const styleConfig = getEventStyle(event.style, accent_color, custom_text_color);

                    return (
                        <div
                            key={i}
                            style={{
                                ...styleConfig,
                                transform: `scale(${scale})`,
                                opacity,
                                textAlign: 'center',
                                maxWidth: '80%',
                                lineHeight: 1.3,
                            }}
                        >
                            {event.style === 'bullet' ? `• ${event.text}` : event.text}
                        </div>
                    );
                })}
            </div>
        );
    }

    // LEGACY MODE: Word-by-word highlighting (fallback)
    if (!text) return null;

    const words = useMemo(() => {
        if (timestamps) return processAlignment(timestamps);
        return text.split(" ").map((w, i) => ({
            text: w,
            start: i * 0.5,
            end: (i + 1) * 0.5
        }));
    }, [timestamps, text]);

    if (words.length === 0) return null;

    const containerClass = fullScreen
        ? "absolute inset-0 flex flex-wrap content-center justify-center p-16 gap-3"
        : "w-full h-full flex flex-wrap content-center justify-center p-8 gap-2";

    const textSize = fullScreen ? "text-7xl" : "text-4xl";

    return (
        <div className={containerClass}>
            {words.map((word, i) => {
                const isActive = currentTime >= word.start && currentTime <= (word.end + 0.2);
                const isPast = currentTime > (word.end + 0.2);

                return (
                    <span
                        key={i}
                        className={`${textSize} font-bold transition-all duration-200`}
                        style={{
                            color: isActive ? (accent_color || '#14b8a6') : (isPast ? (custom_text_color || '#334155') : (custom_text_color ? `${custom_text_color}66` : '#94a3b8')),
                            transform: isActive ? 'scale(1.1) translateY(-5px)' : 'scale(1)',
                            opacity: isActive ? 1 : (isPast ? 0.9 : 0.4),
                            textShadow: isActive ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
                        }}
                    >
                        {word.text}
                    </span>
                );
            })}
        </div>
    );
};


