import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

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

export const KineticText: React.FC<{
    text: string;
    timestamps: Alignment;
    accent_color?: string;
    fullScreen?: boolean;
}> = ({ text, timestamps, accent_color, fullScreen = true }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const currentTime = frame / fps;

    // Safety check - if no text, render nothing
    if (!text) {
        return null;
    }

    const words = useMemo(() => {
        if (timestamps) return processAlignment(timestamps);
        // Fallback: Split text evenly if no timestamps
        return text.split(" ").map((w, i) => ({
            text: w,
            start: i * 0.5,
            end: (i + 1) * 0.5
        }));
    }, [timestamps, text]);

    // If no words to render, return null
    if (words.length === 0) {
        return null;
    }

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
                            color: isActive ? (accent_color || '#14b8a6') : (isPast ? '#334155' : '#94a3b8'),
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
