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
}> = ({ text, timestamps, accent_color }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const currentTime = frame / fps;

    const words = useMemo(() => {
        if (timestamps) return processAlignment(timestamps);
        // Fallback: Split text evenly if no timestamps
        return text.split(" ").map((w, i) => ({
            text: w,
            start: i * 0.5,
            end: (i + 1) * 0.5
        }));
    }, [timestamps, text]);

    return (
        <div className="absolute inset-0 flex flex-wrap content-center justify-center p-24 gap-4">
            {words.map((word, i) => {
                const isActive = currentTime >= word.start && currentTime <= (word.end + 0.2); // Lingering active state
                const isPast = currentTime > (word.end + 0.2);

                return (
                    <span
                        key={i}
                        className={`text-6xl font-bold transition-all duration-300 ${isActive ? 'scale-110 opacity-100' :
                                isPast ? 'opacity-80' : 'opacity-30 blur-sm'
                            }`}
                        style={{
                            color: isActive ? (accent_color || '#14b8a6') : '#1e293b',
                            transform: isActive ? 'translateY(-10px)' : 'none'
                        }}
                    >
                        {word.text}
                    </span>
                );
            })}
        </div>
    );
};
