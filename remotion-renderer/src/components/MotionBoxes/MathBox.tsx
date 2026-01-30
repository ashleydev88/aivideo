import React from 'react';
import { BaseMotionBox } from './BaseMotionBox';
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathBoxProps extends MotionNodeData {
    delay: number;
    formula?: string; // LaTeX
}

export const MathBox: React.FC<MathBoxProps> = ({
    label,
    formula = "E = mc^2",
    variant = 'neutral',
    delay
}) => {

    // Render LaTeX to string
    const html = katex.renderToString(formula, {
        throwOnError: false,
        displayMode: true
    });

    return (
        <BaseMotionBox
            delay={delay}
            enterEffect="scale"
            className={cn(
                "min-w-[200px] p-6 text-center rounded-xl bg-white border border-slate-200 shadow-xl",
                variant === 'accent' && "border-l-4 border-l-violet-500"
            )}
        >
            {label && (
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {label}
                </div>
            )}

            <div
                className="text-2xl text-slate-800"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </BaseMotionBox>
    );
};
