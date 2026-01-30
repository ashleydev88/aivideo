import React from 'react';
import { icons } from 'lucide-react';
import { BaseMotionBox } from './BaseMotionBox';
import { cn } from '../../lib/utils';
import { MotionNodeData } from '../../types/MotionGraph';

interface ArchitectureBoxProps extends MotionNodeData {
    delay: number;
}

export const ArchitectureBox: React.FC<ArchitectureBoxProps> = ({
    label,
    subLabel,
    icon,
    variant = 'primary',
    delay
}) => {
    const IconComponent = icon && icons[icon as keyof typeof icons]
        ? icons[icon as keyof typeof icons]
        : icons.Server;

    return (
        <BaseMotionBox
            delay={delay}
            enterEffect="fade"
            className={cn(
                "w-[160px] h-[100px] flex flex-col items-center justify-center p-3 rounded-lg shadow-md bg-white border-2",
                variant === 'primary' ? 'border-blue-500' : 'border-slate-300'
            )}
        >
            {/* "Ports" decoration */}
            <div className="absolute -left-1 top-1/2 w-2 h-2 bg-slate-400 rounded-full -translate-y-1/2" />
            <div className="absolute -right-1 top-1/2 w-2 h-2 bg-slate-400 rounded-full -translate-y-1/2" />
            <div className="absolute top-[-4px] left-1/2 w-2 h-2 bg-slate-400 rounded-full -translate-x-1/2" />
            <div className="absolute bottom-[-4px] left-1/2 w-2 h-2 bg-slate-400 rounded-full -translate-x-1/2" />

            <IconComponent size={32} className="text-slate-700 mb-2" />
            <span className="font-mono text-xs font-bold text-slate-600">{label}</span>
            {subLabel && <span className="text-[10px] text-slate-400">{subLabel}</span>}
        </BaseMotionBox>
    );
};
