import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';

interface AutoFitTextProps {
    children: React.ReactNode;
    className?: string; // Applied to the scaled content wrapper
    containerClassName?: string; // Applied to the outer fixed container
    maxScale?: number;
    minScale?: number;
}

/**
 * A container that scales its children down to fit within the available space.
 * Uses CSS transform: scale() to preserve layout and relative font sizes.
 */
export const AutoFitText = ({
    children,
    className,
    containerClassName,
    maxScale = 1,
    minScale = 0.1
}: AutoFitTextProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // We use useLayoutEffect to prevent visual flash of unscaled content
    useLayoutEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        // 1. Reset scale to 1 to take accurate measurements
        content.style.transform = 'scale(1)';
        content.style.width = '100%'; // Ensure content tries to fill width naturally first

        // 2. Measure
        const containerHeight = container.clientHeight;
        const containerWidth = container.clientWidth;

        // scrollHeight/Width gives the full size of the content including overflow
        const contentHeight = content.scrollHeight;
        const contentWidth = content.scrollWidth;

        // 3. Calculate Scale
        let newScale = 1;

        // If content is taller than container, must scale down
        if (contentHeight > containerHeight) {
            newScale = containerHeight / contentHeight;
        }

        // If content is wider than container, must scale down further
        // (Use a small buffer for width to prevent aggressive wrapping if unnecessary)
        if (contentWidth > containerWidth) {
            const widthScale = containerWidth / contentWidth;
            newScale = Math.min(newScale, widthScale);
        }

        // 4. Clamp and Buffer
        // 0.96 buffer allows a little padding to prevent rounding errors/clipping
        const bufferedScale = Math.min(newScale, maxScale) * 0.98;
        const finalScale = Math.max(bufferedScale, minScale);

        requestAnimationFrame(() => setScale(finalScale));

    }, [children, maxScale, minScale]);

    return (
        <div ref={containerRef} className={`w-full h-full overflow-hidden ${containerClassName || ''}`}>
            <div
                ref={contentRef}
                style={{
                    transform: `scale(${scale})`,
                    // We let 'transformOrigin' be handled by CSS classes or default to center.
                    // But usually for "fit center", center center is best.
                    // For "fit top left", top left is best.
                    // We'll expose this via className or default to center.
                }}
                className={`w-full h-full flex flex-col ${className || 'items-center justify-center origin-center'}`}
            >
                {children}
            </div>
        </div>
    );
};
