import React from 'react';
import { Img } from 'remotion';

export const WatercolourImage: React.FC<{
    src: string;
    style?: React.CSSProperties;
}> = ({ src, style }) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="relative w-full h-full max-w-5xl max-h-[80vh] flex items-center justify-center">
                {/* Main Image with Blend Mode */}
                <Img
                    src={src}
                    className="object-contain max-w-full max-h-full drop-shadow-xl"
                    style={{
                        mixBlendMode: 'multiply', // Integration with paper texture
                        filter: 'contrast(1.1) saturate(1.1)',
                        ...style
                    }}
                />
            </div>
        </div>
    );
};
