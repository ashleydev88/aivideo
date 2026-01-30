import React, { useEffect, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { MotionGraph } from '../types/MotionGraph';
import { calculateLayout } from '../utils/layoutEngine';
import { ProcessBox } from '../components/MotionBoxes/ProcessBox';
import { ComparisonBox } from '../components/MotionBoxes/ComparisonBox';
import { HierarchyBox } from '../components/MotionBoxes/HierarchyBox';
import { GridBox } from '../components/MotionBoxes/GridBox';
import { EdgeRenderer } from '../components/MotionBoxes/EdgeRenderer';
import { Background } from '../components/Background';

interface MotionChartProps {
    data: MotionGraph;
}

export const MotionChart: React.FC<MotionChartProps> = ({ data }) => {
    const { width, height } = useVideoConfig();
    const [layoutGraph, setLayoutGraph] = useState<MotionGraph | null>(null);

    // Calculate layout on mount
    useEffect(() => {
        calculateLayout(data, width, height).then(setLayoutGraph);
    }, [data, width, height]);

    if (!layoutGraph) return null;

    return (
        <AbsoluteFill className="bg-slate-50">
            {/* Optional: Add a subtle grid or decorative background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            />

            {/* Edges Layer (Behind Nodes) */}
            <EdgeRenderer
                edges={layoutGraph.edges}
                nodes={layoutGraph.nodes}
                archetype={data.archetype}
            />

            {layoutGraph.nodes.map((node, i) => {
                // Staggered animation: 15 frames per item
                const delay = i * 15;

                return (
                    <div
                        key={node.id}
                        style={{
                            position: 'absolute',
                            left: node.position?.x,
                            top: node.position?.y,
                        }}
                    >
                        {/* Dynamic Component Switching */}
                        {(() => {
                            if (data.archetype === 'process' || data.archetype === 'cycle') {
                                return (
                                    <ProcessBox
                                        label={node.data.label}
                                        subLabel={node.data.subLabel}
                                        icon={node.data.icon}
                                        variant={node.data.variant}
                                        delay={delay}
                                    />
                                );
                            } else if (data.archetype === 'hierarchy') {
                                return (
                                    <HierarchyBox
                                        {...node.data}
                                        delay={delay}
                                    />
                                );
                            } else if (data.archetype === 'grid') {
                                return (
                                    <GridBox
                                        {...node.data}
                                        delay={delay}
                                    />
                                );
                            } else {
                                // Default / Comparison / Statistic
                                return (
                                    <ComparisonBox
                                        label={node.data.label}
                                        description={node.data.description}
                                        icon={node.data.icon}
                                        variant={node.data.variant}
                                        delay={delay}
                                    />
                                );
                            }
                        })()}

                        {/* 
                           TODO: Add SVG Edges here connecting nodes.
                           We would map layoutGraph.edges and draw <svg><path ... /></svg>
                        */}
                    </div>
                );
            })}
        </AbsoluteFill>
    );
};
