import React from 'react';
import { icons } from 'lucide-react';
import { BaseMotionBox } from './BaseMotionBox';
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';

interface MindMapBoxProps extends MotionNodeData {
    delay: number;
    isCenter?: boolean;
}

export const MindMapBox: React.FC<MindMapBoxProps> = ({
    label,
    icon,
    variant = 'neutral',
    delay,
    isCenter = false
}) => {
    const IconComponent = icon && icons[icon as keyof typeof icons]
        ? icons[icon as keyof typeof icons]
        : icons.Circle;

    if (isCenter) {
        return (
            <BaseMotionBox
                delay={delay}
                enterEffect="scale"
                className="w-[180px] h-[180px] rounded-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 shadow-2xl z-20 border-4 border-slate-100"
            >
                <IconComponent size={48} className="mb-2 text-blue-400" />
                <h2 className="font-black text-xl text-center leading-tight">{label}</h2>
            </BaseMotionBox>
        );
    }

    return (
        <BaseMotionBox
            delay={delay}
            enterEffect="scale"
            className="w-[140px] p-3 rounded-xl bg-white border border-slate-200 shadow-lg flex flex-col items-center gap-2 z-10"
        >
            <div className={`p-2 rounded-lg ${variant === 'primary' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                <IconComponent size={20} />
            </div>
            <h4 className="font-bold text-sm text-center text-slate-700 leading-tight">{label}</h4>
        </BaseMotionBox>
    );
};
