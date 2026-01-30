import React, { useEffect, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { MotionGraph } from '../types/MotionGraph';
import { calculateLayout } from '../utils/layoutEngine';
import { ProcessBox } from '../components/MotionBoxes/ProcessBox';
import { ComparisonBox } from '../components/MotionBoxes/ComparisonBox';
import { HierarchyBox } from '../components/MotionBoxes/HierarchyBox';
import { GridBox } from '../components/MotionBoxes/GridBox';
import { TimelineBox } from '../components/MotionBoxes/TimelineBox';
import { FunnelBox } from '../components/MotionBoxes/FunnelBox';
import { PyramidBox } from '../components/MotionBoxes/PyramidBox';
import { MindMapBox } from '../components/MotionBoxes/MindMapBox';
import { CodeBox } from '../components/MotionBoxes/CodeBox';
import { MathBox } from '../components/MotionBoxes/MathBox';
import { ArchitectureBox } from '../components/MotionBoxes/ArchitectureBox';
import { MatrixBox } from '../components/MotionBoxes/MatrixBox';
import { MetaphorBox } from '../components/MotionBoxes/MetaphorBox';
import { AnatomyBox } from '../components/MotionBoxes/AnatomyBox';
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
                            } else if (data.archetype === 'timeline') {
                                return (
                                    <TimelineBox
                                        {...node.data}
                                        delay={delay}
                                        index={i}
                                    />
                                );
                            } else if (data.archetype === 'funnel') {
                                return (
                                    <FunnelBox
                                        {...node.data}
                                        delay={delay}
                                        index={i}
                                        total={data.nodes.length}
                                    />
                                );
                            } else if (data.archetype === 'pyramid') {
                                return (
                                    <PyramidBox
                                        {...node.data}
                                        delay={delay}
                                        index={i}
                                        total={data.nodes.length}
                                    />
                                );
                            } else if (data.archetype === 'mindmap') {
                                return (
                                    <MindMapBox
                                        {...node.data}
                                        delay={delay}
                                        isCenter={i === 0} // Assumption: First node is center
                                    />
                                );
                            } else if (data.archetype === 'code') {
                                return (
                                    <CodeBox
                                        {...node.data}
                                        delay={delay}
                                        // Assumption: 'description' usually holds the code content for this box type
                                        code={node.data.description || ''}
                                    />
                                );
                            } else if (data.archetype === 'math') {
                                return (
                                    <MathBox
                                        {...node.data}
                                        delay={delay}
                                        // Assumption: 'description' provides formula
                                        formula={node.data.description || ''}
                                    />
                                );
                            } else if (data.archetype === 'architecture') {
                                return (
                                    <ArchitectureBox
                                        {...node.data}
                                        delay={delay}
                                    />
                                );
                            } else if (data.archetype === 'matrix') {
                                return (
                                    <MatrixBox
                                        {...node.data}
                                        delay={delay}
                                        index={i}
                                    />
                                );
                            } else if (data.archetype === 'metaphor') {
                                return (
                                    <MetaphorBox
                                        {...node.data}
                                        delay={delay}
                                        index={i}
                                        total={data.nodes.length}
                                    />
                                );
                            } else if (data.archetype === 'anatomy') {
                                return (
                                    <AnatomyBox
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
