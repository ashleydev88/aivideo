import React from 'react';
import { Composition } from 'remotion';
import { MainComposition } from './Composition';
import './style.css';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="Main"
                component={MainComposition}
                durationInFrames={300} // Default, will be overridden
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{
                    slide_data: [],
                    accent_color: '#14b8a6'
                }}
            />
        </>
    );
};
