import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { cn } from '../../lib/utils';

export interface BaseMotionBoxProps {
    className?: string;
    children: React.ReactNode;
    delay?: number;
    width?: number | string;
    height?: number | string;
    style?: React.CSSProperties;
    enterEffect?: 'scale' | 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right';
}

export const BaseMotionBox: React.FC<BaseMotionBoxProps> = ({
    className,
    children,
    delay = 0,
    width,
    height,
    style,
    enterEffect = 'scale'
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const spr = spring({
        frame: frame - delay,
        fps,
        config: { damping: 14, mass: 0.8, stiffness: 120 }
    });

    // Effect Logic
    const outputRange = enterEffect === 'scale' ? [0, 1] : [0, 1];
    const opacity = interpolate(spr, [0, 1], outputRange);

    let transform = '';
    if (enterEffect === 'scale') {
        const scale = interpolate(spr, [0, 1], [0.6, 1]);
        transform = `scale(${scale})`;
    } else if (enterEffect === 'slide-up') {
        const y = interpolate(spr, [0, 1], [40, 0]);
        transform = `translateY(${y}px)`;
    } else if (enterEffect === 'slide-down') {
        const y = interpolate(spr, [0, 1], [-40, 0]);
        transform = `translateY(${y}px)`;
    } else if (enterEffect === 'slide-left') {
        const x = interpolate(spr, [0, 1], [40, 0]);
        transform = `translateX(${x}px)`;
    } else if (enterEffect === 'slide-right') {
        const x = interpolate(spr, [0, 1], [-40, 0]);
        transform = `translateX(${x}px)`;
    }

    return (
        <div
            className={cn(
                "bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-slate-100",
                className
            )}
            style={{
                width,
                height,
                opacity,
                transform,
                ...style
            }}
        >
            {children}
        </div>
    );
};
