import React, { useEffect, useState } from 'react';
import { BaseMotionBox } from './BaseMotionBox';
// import { getHighlighter } from 'shiki'; // Shiki is async, might be tricky in Remotion without delays
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';

// Mocking Shiki for now to avoid complexity with WASM in Remotion for this iteration
// In a real implementation, we'd use a useEffect to load the highlighter
// or pre-compute the tokens.

interface CodeBoxProps extends MotionNodeData {
    delay: number;
    code?: string;
    language?: string;
}

export const CodeBox: React.FC<CodeBoxProps> = ({
    label,
    code = "console.log('Hello World');",
    language = 'javascript',
    variant = 'secondary',
    delay
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Typing animation logic
    // Char by char appearing
    const totalChars = code.length;
    const typingSpeed = 2; // chars per frame
    const startFrame = delay + 10;
    const currentLength = Math.min(
        totalChars,
        Math.max(0, Math.floor((frame - startFrame) * typingSpeed))
    );

    const displayCode = code.substring(0, currentLength);

    return (
        <BaseMotionBox
            delay={delay}
            enterEffect="fade"
            className={cn(
                "w-[400px] text-left rounded-lg shadow-2xl overflow-hidden font-mono text-sm",
                "bg-slate-900 text-slate-300 border border-slate-700"
            )}
        >
            {/* Window Controls */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="flex-1 text-center text-xs text-slate-500 font-sans">{label || 'script.ts'}</div>
            </div>

            <div className="p-4 leading-relaxed overflow-x-hidden">
                <pre>
                    <code className={`language-${language}`}>
                        {displayCode}
                        <span className="animate-pulse inline-block w-2 h-4 bg-blue-500 align-middle ml-1" />
                    </code>
                </pre>
            </div>
        </BaseMotionBox>
    );
};
