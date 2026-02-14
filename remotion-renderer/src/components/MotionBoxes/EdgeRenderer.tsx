import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { MotionEdge, MotionNode, MotionArchetype, TimingResolvedEntry } from '../../types/MotionGraph';

interface EdgeRendererProps {
    edges: MotionEdge[];
    nodes: MotionNode[]; // Needed for positions
    archetype: MotionArchetype;
    timingResolved?: TimingResolvedEntry[];
}

const getHandle = (node: MotionNode, type: 'source' | 'target', archetype: MotionArchetype) => {
    // Use measured node dimensions when available.
    const W = node.nodeSize?.width || 250;
    const H = node.nodeSize?.height || 180;

    // Default: Process = Left-to-Right, Hierarchy = Top-to-Down
    const isHorizontal = archetype === 'process' || archetype === 'cycle';

    const x = node.position?.x || 0;
    const y = node.position?.y || 0;

    if (isHorizontal) {
        if (type === 'source') return { x: x + W, y: y + H / 2 }; // Right
        return { x: x, y: y + H / 2 }; // Left
    } else {
        if (type === 'source') return { x: x + W / 2, y: y + H }; // Bottom
        return { x: x + W / 2, y: y }; // Top
    }
};

const getPath = (source: { x: number, y: number }, target: { x: number, y: number }, archetype: MotionArchetype) => {
    const isHorizontal = archetype === 'process' || archetype === 'cycle';

    // Curvature for Bezier
    const dX = Math.abs(target.x - source.x);
    const dY = Math.abs(target.y - source.y);
    const curvature = isHorizontal ? Math.min(dX * 0.5, 100) : Math.min(dY * 0.5, 100);

    if (isHorizontal) {
        // Cubic Bezier: Source -> Control1 -> Control2 -> Target
        const cp1 = { x: source.x + curvature, y: source.y };
        const cp2 = { x: target.x - curvature, y: target.y };
        return `M ${source.x} ${source.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${target.x} ${target.y}`;
    } else {
        const cp1 = { x: source.x, y: source.y + curvature };
        const cp2 = { x: target.x, y: target.y - curvature };
        return `M ${source.x} ${source.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${target.x} ${target.y}`;
    }
}

export const EdgeRenderer: React.FC<EdgeRendererProps> = ({ edges, nodes, archetype, timingResolved = [] }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const edgeDelayById = new Map<string, number>();
    timingResolved
        .filter((item) => item?.source_type === 'edge' && typeof item?.source_id === 'string')
        .forEach((item) => {
            const startMs = Number(item.start_ms || 0);
            edgeDelayById.set(item.source_id, Math.max(0, Math.floor((startMs / 1000) * fps)));
        });

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                </marker>
            </defs>

            {edges.map((edge, i) => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);

                if (!sourceNode || !targetNode) return null;

                const start = getHandle(sourceNode, 'source', archetype);
                const end = getHandle(targetNode, 'target', archetype);
                const d = getPath(start, end, archetype);

                // Animation
                // Stagger edges slightly after nodes appear?
                // Nodes appear at i*15. Edges should appear between i and i+1?
                // Let's assume edge takes 'delay' from the TARGET node's appearance time
                const targetIndex = nodes.indexOf(targetNode);
                const fallbackDelay = (targetIndex * 15) + 10; // 10 frames after target starts appearing
                const delay = edgeDelayById.get(edge.id) ?? fallbackDelay;

                const spr = spring({
                    frame: frame - delay,
                    fps,
                    config: { damping: 20, stiffness: 80 }
                });

                // Draw path effect
                const progress = interpolate(spr, [0, 1], [0, 1]);

                return (
                    <g key={edge.id}>
                        {/* Background Path (Thicker, for border effect) */}
                        <path
                            d={d}
                            stroke="white"
                            strokeWidth="8"
                            fill="none"
                            style={{ opacity: progress }}
                        />
                        {/* Foreground Path */}
                        <path
                            d={d}
                            stroke="#cbd5e1"
                            strokeWidth="3"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                            strokeDasharray="1000"
                            strokeDashoffset={1000 * (1 - progress)}
                            style={{ opacity: progress }}
                        />
                        {edge.label && (
                            <foreignObject
                                x={(start.x + end.x) / 2 - 50}
                                y={(start.y + end.y) / 2 - 15}
                                width="100"
                                height="30"
                                style={{ opacity: progress }}
                            >
                                <div className="bg-white/80 backdrop-blur text-xs font-mono text-slate-500 text-center rounded px-1 border border-slate-200">
                                    {edge.label}
                                </div>
                            </foreignObject>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};
