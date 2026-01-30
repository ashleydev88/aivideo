import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { MotionChart } from './MotionChart';
import { MotionGraph } from '../types/MotionGraph';
import sampleGraph from '../data/sample_graph.json';

export const MotionFlowComposition: React.FC = () => {
    // In a real scenario, this data comes from props or an API
    // For now, we cast the sample JSON to our type
    const graphData = sampleGraph as unknown as MotionGraph;

    return (
        <AbsoluteFill className="bg-white">
            <MotionChart data={graphData} />
        </AbsoluteFill>
    );
};
