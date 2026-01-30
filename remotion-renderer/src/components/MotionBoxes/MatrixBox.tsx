import React from 'react';
import { BaseMotionBox } from './BaseMotionBox';
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';

interface MatrixBoxProps extends MotionNodeData {
    delay: number;
    index: number; // 0=TL, 1=TR, 2=BL, 3=BR
}

export const MatrixBox: React.FC<MatrixBoxProps> = ({
    label,
    description,
    variant = 'neutral',
    delay,
    index
}) => {

    const quadrantStyles = [
        'bg-red-50 border-red-200 text-red-800',  // Top Left
        'bg-green-50 border-green-200 text-green-800', // Top Right
        'bg-blue-50 border-blue-200 text-blue-800',   // Bottom Left
        'bg-yellow-50 border-yellow-200 text-yellow-800' // Bottom Right
    ];

    const style = quadrantStyles[index % 4];

    return (
        <BaseMotionBox
            delay={delay}
            enterEffect="scale"
            className={cn(
                "w-[240px] h-[180px] p-6 flex flex-col justify-start rounded-xl border-2 shadow-sm transition-all",
                style
            )}
        >
            <h3 className="font-black text-xl mb-2 uppercase tracking-tight opacity-80">{label}</h3>
            {description && (
                <p className="text-sm font-medium leading-relaxed opacity-90">
                    {description}
                </p>
            )}
        </BaseMotionBox>
    );
};
