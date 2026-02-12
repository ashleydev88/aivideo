/**
 * MotionGraphPreview
 * 
 * Frontend preview component for MotionGraph data.
 * Mirrors Remotion's MotionChart.tsx but with static rendering.
 * Uses CSS-based layout (no ELK.js dependency).
 */
import React from 'react';
import parse from 'html-react-parser';
import * as Lucide from 'lucide-react';
import { MotionGraph, MotionNode, getVariantColor } from '@/lib/types/MotionGraph';
import { PreviewMotionBox, PreviewStatBox } from './PreviewMotionBox';

interface MotionGraphPreviewProps {
    data: MotionGraph;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    backgroundImage?: string | null;
    onUpdate?: (newData: MotionGraph) => void;
}

// Get icon component from kebab-case name
const getIcon = (iconName?: string) => {
    if (!iconName) return Lucide.Box;
    const pascalCase = iconName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    return (Lucide as any)[pascalCase] || Lucide.Box;
};

export const MotionGraphPreview: React.FC<MotionGraphPreviewProps> = ({
    data,
    accentColor = '#14b8a6',
    backgroundColor = '#f8fafc',
    textColor = '#0f172a',
    backgroundImage,
    onUpdate,
}) => {
    if (!data || !data.nodes || data.nodes.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
                No chart data available
            </div>
        );
    }

    const { archetype, nodes, metadata } = data;
    const title = metadata?.title || '';

    // Render title
    const renderTitle = () => {
        if (!title) return null;
        const isHtml = /<[a-z][\s\S]*>/i.test(title);

        return (
            <div className="w-full flex flex-col items-center justify-center mb-16">
                {onUpdate ? (
                    <textarea
                        value={title}
                        onChange={(e) => handleTitleUpdate(e.target.value)}
                        className="text-7xl font-black tracking-tight uppercase text-center max-w-7xl mx-auto bg-transparent w-full resize-none outline-none focus:ring-2 focus:ring-teal-500 rounded p-2"
                        rows={1}
                        style={{ color: textColor, fieldSizing: 'content' } as any}
                    />
                ) : (
                    <div
                        className="text-7xl font-black tracking-tight uppercase text-center max-w-7xl mx-auto"
                        style={{ color: textColor }}
                    >
                        {isHtml ? (
                            <div className="prose prose-2xl max-w-none dark:prose-invert">
                                <style>{`h1, h2, h3, p { margin: 0; font-size: inherit; font-weight: inherit; } strong { color: ${accentColor}; }`}</style>
                                {parse(title)}
                            </div>
                        ) : (
                            title
                        )}
                    </div>
                )}
                <div className="h-3 w-48 mt-6 mx-auto rounded-full" style={{ backgroundColor: accentColor }} />
            </div>
        );
    };

    // Update Handler
    const handleNodeUpdate = (nodeId: string, field: string, value: string) => {
        if (!onUpdate) return;
        const newNodes = nodes.map(n =>
            n.id === nodeId
                ? { ...n, data: { ...n.data, [field]: value } }
                : n
        );
        onUpdate({ ...data, nodes: newNodes });
    };

    const handleTitleUpdate = (newTitle: string) => {
        if (!onUpdate) return;
        onUpdate({ ...data, metadata: { ...data.metadata, title: newTitle } });
    };

    // Render nodes based on archetype
    const renderNodes = () => {
        switch (archetype) {
            case 'process':
            case 'cycle':
            case 'timeline':
                return renderHorizontalFlow();
            case 'hierarchy':
            case 'funnel':
            case 'pyramid':
                return renderVerticalStack();
            case 'grid':
            case 'comparison':
                return renderGrid();
            case 'statistic':
                return renderStats();
            case 'mindmap':
                return renderRadial();
            case 'code':
            case 'math':
                return renderCodeMath();
            case 'architecture':
                return renderArchitecture();
            case 'matrix':
                return renderMatrix();
            case 'metaphor':
                return renderMetaphor();
            case 'anatomy':
                return renderAnatomy();
            case 'document-anchor':
                return renderDocumentAnchor();
            case 'contextual-overlay':
                return renderContextualOverlay();
            default:
                return renderGrid();
        }
    };

    // Horizontal flow (process, cycle, timeline)
    // Horizontal flow (process, cycle, timeline)
    const renderHorizontalFlow = () => {
        const nodeCount = nodes.length;

        // Calculate scale factor to fit within available width
        // Assume available width ~1000px (standard preview width is often smaller in split view, but we scale relative to a "full" canvas)
        // Base node width: ~280px + 32px gap = 312px
        const availableWidth = 1000;
        const baseNodeWidth = 312;
        const requiredWidth = nodeCount * baseNodeWidth;
        // Add some padding buffer
        const scaleFactor = Math.min(1, availableWidth / (requiredWidth + 100));
        const clampedScale = Math.max(0.4, scaleFactor);

        // Scaled values
        const gap = Math.round(32 * clampedScale);
        const iconSize = Math.round(48 * clampedScale); // Passed to arrow

        return (
            <div
                className="flex flex-row items-center justify-center w-full"
                style={{ gap: `${gap}px` }}
            >
                {nodes.map((node, i) => (
                    <React.Fragment key={node.id}>
                        {i > 0 && (
                            <div className="flex-shrink-0">
                                <Lucide.ArrowRight size={iconSize} color={textColor + 'aa'} strokeWidth={3} />
                            </div>
                        )}
                        <div style={{ transform: `scale(${clampedScale})`, transformOrigin: 'center' }}>
                            <PreviewMotionBox
                                label={node.data.label}
                                subLabel={node.data.subLabel}
                                icon={node.data.icon}
                                variant={node.data.variant}
                                isEditable={!!onUpdate}
                                onUpdate={(field, val) => handleNodeUpdate(node.id, field, val)}
                            />
                        </div>
                    </React.Fragment>
                ))}
                {archetype === 'cycle' && nodes.length > 1 && (
                    <div className="flex-shrink-0">
                        <Lucide.RotateCcw size={iconSize} color={accentColor} strokeWidth={3} />
                    </div>
                )}
            </div>
        );
    };

    // Vertical stack (hierarchy, funnel, pyramid)
    // Dynamically scales based on node count to prevent overflow
    const renderVerticalStack = () => {
        const isFunnelOrPyramid = archetype === 'funnel' || archetype === 'pyramid';
        const nodeCount = nodes.length;

        // Calculate scale factor to fit all nodes within available height
        // Available height: ~700px (1080 - title - padding - margins)
        // Base node height: ~120px + 24px gap = 144px per node
        const availableHeight = 700;
        const baseNodeHeight = 144;
        const requiredHeight = nodeCount * baseNodeHeight;
        const scaleFactor = Math.min(1, availableHeight / requiredHeight);

        // Apply minimum scale to maintain readability
        const clampedScale = Math.max(0.6, scaleFactor);

        // Scaled values
        const gap = Math.round(24 * clampedScale);
        const padding = Math.round(32 * clampedScale);
        const iconContainerPadding = Math.round(16 * clampedScale);
        const iconSize = Math.round(40 * clampedScale);
        const labelFontSize = Math.round(30 * clampedScale);
        const descFontSize = Math.round(20 * clampedScale);
        const borderRadius = Math.round(16 * clampedScale);

        return (
            <div
                className="flex flex-col items-center justify-center w-full max-w-6xl"
                style={{ gap: `${gap}px`, maxHeight: '100%' }}
            >
                {nodes.map((node, i) => {
                    const widthPercent = isFunnelOrPyramid
                        ? (archetype === 'funnel' ? 100 - (i * 12) : 100 - (i * 15))
                        : 100;
                    const color = getVariantColor(node.data.variant, accentColor);

                    return (
                        <div
                            key={node.id}
                            className="bg-white shadow-md flex items-center border-l-8 flex-shrink-0"
                            style={{
                                width: `${widthPercent}%`,
                                borderLeftColor: color,
                                padding: `${padding}px`,
                                gap: `${padding}px`,
                                borderRadius: `${borderRadius}px`,
                            }}
                        >
                            <div
                                className="rounded-xl flex-shrink-0"
                                style={{
                                    backgroundColor: color + '20',
                                    padding: `${iconContainerPadding}px`,
                                }}
                            >
                                {React.createElement(getIcon(node.data.icon), { size: iconSize, color })}
                            </div>
                            <div className="w-full min-w-0">
                                {onUpdate ? (
                                    <input
                                        value={node.data.label}
                                        onChange={(e) => handleNodeUpdate(node.id, 'label', e.target.value)}
                                        className="font-black text-slate-800 bg-transparent w-full outline-none focus:bg-slate-50 rounded"
                                        style={{ fontSize: `${labelFontSize}px` }}
                                    />
                                ) : (
                                    <h4
                                        className="font-black text-slate-800 break-words"
                                        style={{ fontSize: `${labelFontSize}px` }}
                                    >
                                        {node.data.label}
                                    </h4>
                                )}

                                {(node.data.description || onUpdate) && (
                                    onUpdate ? (
                                        <input
                                            value={node.data.description || ''}
                                            onChange={(e) => handleNodeUpdate(node.id, 'description', e.target.value)}
                                            className="text-slate-500 mt-1 bg-transparent w-full outline-none focus:bg-slate-50 rounded"
                                            style={{ fontSize: `${descFontSize}px` }}
                                            placeholder="Description"
                                        />
                                    ) : (
                                        <p
                                            className="text-slate-500 line-clamp-2 mt-1"
                                            style={{ fontSize: `${descFontSize}px` }}
                                        >
                                            {node.data.description}
                                        </p>
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Grid layout (grid, comparison)
    // Dynamically scales based on node count to prevent overflow
    const renderGrid = () => {
        const nodeCount = nodes.length;
        const rowCount = Math.ceil(nodeCount / 2);

        // Calculate scale factor based on available height
        // Available height: ~700px, base row height: ~200px + 48px gap
        const availableHeight = 700;
        const baseRowHeight = 248;
        const requiredHeight = rowCount * baseRowHeight;
        const scaleFactor = Math.min(1, availableHeight / requiredHeight);
        const clampedScale = Math.max(0.5, scaleFactor);

        // Scaled values
        const gap = Math.round(48 * clampedScale);
        const padding = Math.round(32 * clampedScale);
        const iconContainerPadding = Math.round(20 * clampedScale);
        const iconSize = Math.round(48 * clampedScale);
        const labelFontSize = Math.round(30 * clampedScale);
        const descFontSize = Math.round(20 * clampedScale);
        const borderRadius = Math.round(24 * clampedScale);

        return (
            <div
                className="grid grid-cols-2 w-full max-w-7xl px-6"
                style={{ gap: `${gap}px`, gridAutoRows: '1fr' }}
            >
                {nodes.map((node) => {
                    // Strict color coding for comparisons
                    let color = getVariantColor(node.data.variant, accentColor);
                    if (node.data.variant === 'negative') color = '#ef4444'; // Red-500
                    if (node.data.variant === 'positive') color = '#22c55e'; // Green-500

                    return (
                        <div
                            key={node.id}
                            className="bg-white shadow-lg flex flex-col border-t-8"
                            style={{
                                borderTopColor: color,
                                borderRadius: `${borderRadius}px`,
                            }}
                        >
                            {/* Image Section (if available) - Flexible height */}
                            {node.data.image && (
                                <div className="w-full relative bg-slate-100 border-b overflow-hidden" style={{ borderColor: color + '20', height: '45%' }}>
                                    <img
                                        src={node.data.image}
                                        alt={node.data.label}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Tint overlay matching variant */}
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundColor: color }} />
                                </div>
                            )}

                            <div className="flex flex-col flex-1" style={{ padding: `${padding}px`, gap: `${padding / 2}px` }}>
                                <div className="flex items-start gap-4">
                                    <div
                                        className="rounded-full flex-shrink-0 flex items-center justify-center shadow-sm"
                                        style={{
                                            backgroundColor: color,
                                            width: `${iconSize * 1.5}px`,
                                            height: `${iconSize * 1.5}px`,
                                        }}
                                    >
                                        {React.createElement(getIcon(node.data.icon), { size: iconSize, color: '#ffffff' })}
                                    </div>
                                    {onUpdate ? (
                                        <textarea
                                            value={node.data.label}
                                            onChange={(e) => handleNodeUpdate(node.id, 'label', e.target.value)}
                                            className="font-black text-slate-800 bg-transparent w-full outline-none focus:bg-slate-50 rounded min-w-0 flex-1 resize-none"
                                            style={{ fontSize: `${labelFontSize}px`, fieldSizing: 'content' } as any}
                                            rows={1}
                                        />
                                    ) : (
                                        <h4
                                            className="font-black text-slate-800 leading-tight min-w-0 flex-1 pb-1"
                                            style={{ fontSize: `${labelFontSize}px`, overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                                        >
                                            {node.data.label}
                                        </h4>
                                    )}
                                </div>

                                {(node.data.description || onUpdate) && (
                                    onUpdate ? (
                                        <textarea
                                            value={node.data.description || ''}
                                            onChange={(e) => handleNodeUpdate(node.id, 'description', e.target.value)}
                                            className="text-slate-500 mt-2 leading-relaxed bg-transparent w-full resize-none outline-none focus:bg-slate-50 rounded flex-1"
                                            style={{ fontSize: `${descFontSize}px` }}
                                            rows={2}
                                            placeholder="Description"
                                        />
                                    ) : (
                                        <p
                                            className="text-slate-500 mt-2 leading-relaxed"
                                            style={{ fontSize: `${descFontSize}px` }}
                                        >
                                            {node.data.description}
                                        </p>
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Statistics display
    const renderStats = () => (
        <div className="flex flex-row gap-16 justify-center w-full flex-wrap">
            {nodes.map((node) => (
                <PreviewStatBox
                    key={node.id}
                    label={node.data.label}
                    description={node.data.description}
                    value={node.data.value}
                    variant={node.data.variant}
                    isEditable={!!onUpdate}
                    onUpdate={(field, val) => handleNodeUpdate(node.id, field, val)}
                />
            ))}
        </div>
    );

    // Radial layout (mindmap)
    const renderRadial = () => {
        const centerNode = nodes[0];
        const orbitNodes = nodes.slice(1);

        // Increased container size and radius to prevent overlaps
        const containerSize = 1800; // was 1600
        const radius = 750; // was 650
        const centerXY = containerSize / 2;

        // Visual centering adjustment:
        // If orbital nodes are not evenly distributed around the circle (e.g., only 3 nodes),
        // the geometric center of the nodes might not be the visual center of the content.
        // We calculate a vertical offset to make the center node feel truly "middle".
        let yOffset = 0;
        if (orbitNodes.length > 0) {
            const yPositions = orbitNodes.map((_, i) => {
                const angle = (i / orbitNodes.length) * 2 * Math.PI - Math.PI / 2;
                return Math.sin(angle) * radius;
            });
            const minY = Math.min(...yPositions, 0); // Include center line (0) if needed
            const maxY = Math.max(...yPositions, 0);
            const visualMidpoint = (minY + maxY) / 2;
            yOffset = visualMidpoint; // Shift center node to the orbital visual midpoint
        }

        return (
            <div
                className="relative flex items-center justify-center transform origin-center"
                style={{
                    width: `${containerSize}px`,
                    height: `${containerSize}px`,
                    // Scale down slightly more to fit in standard viewports given larger container
                    transform: 'scale(0.5)'
                }}
            >
                {/* Center node */}
                <div
                    className="absolute z-10 transition-all duration-500"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, calc(-50% + ${yOffset}px))`
                    }}
                >
                    <PreviewMotionBox
                        label={centerNode.data.label}
                        icon={centerNode.data.icon}
                        variant={centerNode.data.variant || 'primary'}
                        isEditable={!!onUpdate}
                        onUpdate={(field, val) => handleNodeUpdate(centerNode.id, field, val)}
                        className="scale-110 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]" // More dramatic shadow for center
                    />
                </div>

                {/* Orbit nodes */}
                {orbitNodes.map((node, i) => {
                    const angle = (i / orbitNodes.length) * 2 * Math.PI - Math.PI / 2;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                        <div
                            key={node.id}
                            className="absolute transition-all duration-500"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                                maxWidth: '450px'
                            }}
                        >
                            <PreviewMotionBox
                                label={node.data.label}
                                icon={node.data.icon}
                                variant={node.data.variant}
                                description={node.data.description} // Ensure description is passed
                                isEditable={!!onUpdate}
                                onUpdate={(field, val) => handleNodeUpdate(node.id, field, val)}
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    // Code/Math display
    const renderCodeMath = () => (
        <div className="w-full max-w-6xl space-y-8">
            {nodes.map((node) => (
                <div key={node.id} className="bg-slate-800 rounded-3xl p-8 shadow-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <Lucide.Code size={32} className="text-teal-400" />
                        {onUpdate ? (
                            <input
                                value={node.data.label}
                                onChange={(e) => handleNodeUpdate(node.id, 'label', e.target.value)}
                                className="text-teal-400 text-2xl font-mono bg-transparent w-full outline-none focus:ring-1 focus:ring-teal-500 rounded"
                            />
                        ) : (
                            <span className="text-teal-400 text-2xl font-mono">{node.data.label}</span>
                        )}
                    </div>
                    {onUpdate ? (
                        <textarea
                            value={node.data.description || ''}
                            onChange={(e) => handleNodeUpdate(node.id, 'description', e.target.value)}
                            className="text-slate-100 font-mono text-2xl w-full bg-transparent resize-none outline-none focus:ring-1 focus:ring-teal-500 rounded p-2"
                            rows={4}
                        />
                    ) : (
                        <pre className="text-slate-100 font-mono text-2xl overflow-x-auto p-2">
                            {node.data.description || '// code here'}
                        </pre>
                    )}
                </div>
            ))}
        </div>
    );

    // Architecture diagram
    const renderArchitecture = () => (
        <div className="flex flex-col items-center gap-8 w-full max-w-7xl">
            <div className="flex flex-row gap-8 flex-wrap justify-center">
                {nodes.map((node) => {
                    const color = getVariantColor(node.data.variant, accentColor);
                    return (
                        <div
                            key={node.id}
                            className="bg-white rounded-3xl shadow-lg p-6 border-4 min-w-[280px] text-center"
                            style={{ borderColor: color }}
                        >
                            <div className="flex justify-center mb-4">
                                {React.createElement(getIcon(node.data.icon), { size: 56, color })}
                            </div>
                            {onUpdate ? (
                                <input
                                    value={node.data.label}
                                    onChange={(e) => handleNodeUpdate(node.id, 'label', e.target.value)}
                                    className="font-black text-slate-800 text-2xl bg-transparent w-full text-center outline-none focus:bg-slate-50 rounded"
                                />
                            ) : (
                                <h4 className="font-black text-slate-800 text-2xl">{node.data.label}</h4>
                            )}

                            {(node.data.subLabel || onUpdate) && (
                                onUpdate ? (
                                    <input
                                        value={node.data.subLabel || ''}
                                        onChange={(e) => handleNodeUpdate(node.id, 'subLabel', e.target.value)}
                                        className="text-lg text-slate-500 mt-2 bg-transparent w-full text-center outline-none focus:bg-slate-50 rounded"
                                        placeholder="Sub-label"
                                    />
                                ) : (
                                    <p className="text-lg text-slate-500 mt-2">{node.data.subLabel}</p>
                                )
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // 2x2 Matrix
    const renderMatrix = () => (
        <div className="grid grid-cols-2 gap-8 w-full max-w-6xl">
            {nodes.slice(0, 4).map((node, i) => {
                const color = getVariantColor(node.data.variant, accentColor);
                return (
                    <div
                        key={node.id}
                        className="bg-white rounded-3xl shadow-lg p-10 text-center border-t-8"
                        style={{ borderTopColor: color }}
                    >
                        <h4 className="font-black text-slate-800 text-3xl">
                            {onUpdate ? (
                                <input
                                    value={node.data.label}
                                    onChange={(e) => handleNodeUpdate(node.id, 'label', e.target.value)}
                                    className="bg-transparent w-full text-center outline-none focus:bg-slate-50 rounded"
                                />
                            ) : (
                                node.data.label
                            )}
                        </h4>
                        {(node.data.description || onUpdate) && (
                            <div className="text-xl text-slate-500 mt-4 leading-relaxed">
                                {onUpdate ? (
                                    <textarea
                                        value={node.data.description || ''}
                                        onChange={(e) => handleNodeUpdate(node.id, 'description', e.target.value)}
                                        className="bg-transparent w-full resize-none outline-none focus:bg-slate-50 rounded text-center"
                                        rows={2}
                                        placeholder="Description"
                                    />
                                ) : (
                                    node.data.description
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    // Metaphor (iceberg-style)
    const renderMetaphor = () => {
        const surfaceNodes = nodes.slice(0, Math.ceil(nodes.length / 2));
        const deepNodes = nodes.slice(Math.ceil(nodes.length / 2));

        return (
            <div className="w-full max-w-6xl space-y-12">
                {/* Surface level */}
                <div className="bg-blue-50 rounded-3xl p-8 border-l-8 border-blue-400">
                    <h4 className="text-blue-600 font-black mb-6 flex items-center gap-4 text-3xl">
                        <Lucide.Eye size={32} /> Visible
                    </h4>
                    <div className="space-y-4">
                        {surfaceNodes.map(node => (
                            <div key={node.id} className="bg-white rounded-2xl p-6 shadow-sm">
                                {onUpdate ? (
                                    <input
                                        value={node.data.label}
                                        onChange={(e) => handleNodeUpdate(node.id, 'label', e.target.value)}
                                        className="font-bold text-slate-700 text-2xl bg-transparent w-full outline-none focus:bg-slate-50 rounded"
                                    />
                                ) : (
                                    <span className="font-bold text-slate-700 text-2xl">{node.data.label}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deep level */}
                <div className="bg-slate-100 rounded-3xl p-8 border-l-8 border-slate-500">
                    <h4 className="text-slate-600 font-black mb-6 flex items-center gap-4 text-3xl">
                        <Lucide.EyeOff size={32} /> Hidden
                    </h4>
                    <div className="space-y-4">
                        {deepNodes.map(node => (
                            <div key={node.id} className="bg-white rounded-2xl p-6 shadow-sm">
                                {onUpdate ? (
                                    <input
                                        value={node.data.label}
                                        onChange={(e) => handleNodeUpdate(node.id, 'label', e.target.value)}
                                        className="font-bold text-slate-700 text-2xl bg-transparent w-full outline-none focus:bg-slate-50 rounded"
                                    />
                                ) : (
                                    <span className="font-bold text-slate-700 text-2xl">{node.data.label}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // Anatomy (labels around center)
    const renderAnatomy = () => {
        const centerNode = nodes[0];
        const labelNodes = nodes.slice(1);

        return (
            <div className="relative w-[1200px] h-[800px] flex items-center justify-center">
                {/* Center subject */}
                <div className="bg-white rounded-3xl shadow-xl p-12 z-10 text-center">
                    {React.createElement(getIcon(centerNode?.data.icon), {
                        size: 80,
                        color: accentColor,
                        className: 'mx-auto mb-4'
                    })}
                    {onUpdate ? (
                        <input
                            value={centerNode?.data.label}
                            onChange={(e) => handleNodeUpdate(centerNode.id, 'label', e.target.value)}
                            className="font-black text-slate-800 text-4xl bg-transparent w-full text-center outline-none focus:bg-slate-50 rounded"
                        />
                    ) : (
                        <h3 className="font-black text-slate-800 text-4xl">{centerNode?.data.label}</h3>
                    )}
                </div>

                {/* Label callouts */}
                {labelNodes.map((node, i) => {
                    const positions = [
                        { left: 40, top: 60 },
                        { right: 40, top: 60 },
                        { left: 40, bottom: 60 },
                        { right: 40, bottom: 60 },
                    ];
                    const pos = positions[i % positions.length];

                    return (
                        <div
                            key={node.id}
                            style={pos}
                        >
                            {onUpdate ? (
                                <input
                                    value={node.data.label}
                                    onChange={(e) => handleNodeUpdate(node.id, 'label', e.target.value)}
                                    className="font-bold text-slate-700 bg-transparent w-full text-center outline-none focus:bg-slate-50 rounded"
                                />
                            ) : (
                                <span className="font-bold text-slate-700">{node.data.label}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // Document Anchor (Quotes/Citations)
    const renderDocumentAnchor = () => {
        const quoteNode = nodes[0];
        const color = getVariantColor(quoteNode?.data.variant, accentColor);

        return (
            <div className="flex items-center justify-center w-full max-w-5xl h-full">
                <div className="relative bg-white rounded-3xl shadow-xl p-16 border-l-[16px]" style={{ borderColor: color }}>
                    <Lucide.Quote size={80} className="absolute -top-10 -left-10 text-slate-800 bg-white p-2 rounded-full shadow-lg" />

                    <div className="space-y-8">
                        {onUpdate ? (
                            <textarea
                                value={quoteNode?.data.label}
                                onChange={(e) => handleNodeUpdate(quoteNode.id, 'label', e.target.value)}
                                className="font-black text-5xl text-slate-800 leading-tight w-full bg-transparent resize-none outline-none focus:bg-slate-50 rounded"
                                rows={3}
                                placeholder="Quote or key text..."
                            />
                        ) : (
                            <blockquote className="font-black text-5xl text-slate-800 leading-tight">
                                "{quoteNode?.data.label}"
                            </blockquote>
                        )}

                        <div className="flex items-center gap-4 border-t pt-8" style={{ borderColor: color + '40' }}>
                            <div className="w-16 h-1 w-16 rounded-full" style={{ backgroundColor: color }} />
                            {onUpdate ? (
                                <div className="w-full flex flex-col gap-2">
                                    <input
                                        value={quoteNode?.data.subLabel || ''}
                                        onChange={(e) => handleNodeUpdate(quoteNode.id, 'subLabel', e.target.value)}
                                        className="font-bold text-slate-600 text-2xl bg-transparent outline-none focus:bg-slate-50 rounded"
                                        placeholder="Author / Source"
                                    />
                                    <input
                                        value={quoteNode?.data.description || ''}
                                        onChange={(e) => handleNodeUpdate(quoteNode.id, 'description', e.target.value)}
                                        className="text-slate-400 text-xl bg-transparent outline-none focus:bg-slate-50 rounded"
                                        placeholder="Context / Date"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <cite className="block font-bold text-slate-600 text-2xl not-italic">
                                        {quoteNode?.data.subLabel || 'Unknown Source'}
                                    </cite>
                                    {quoteNode?.data.description && (
                                        <span className="text-slate-400 text-xl">
                                            {quoteNode.data.description}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Contextual Overlay (Text over visual placeholder)
    const renderContextualOverlay = () => {
        // Find main text node and potentially secondary nodes
        const mainNode = nodes[0];
        const secondaryNodes = nodes.slice(1);

        const fadeColor = backgroundColor || '#0f172a';
        const isHex = fadeColor.startsWith('#');

        // Helper to get translucent versions of the background color
        const getTranslucentColor = (alpha: number) => {
            if (!isHex || fadeColor.length < 7) return fadeColor; // Basic fallback
            const r = parseInt(fadeColor.slice(1, 3), 16);
            const g = parseInt(fadeColor.slice(3, 5), 16);
            const b = parseInt(fadeColor.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        return (
            <div className="w-full h-full relative flex items-center justify-start p-24">
                {/* Background (Image or Placeholder) */}
                <div className="absolute inset-0 bg-slate-200 flex items-center justify-center overflow-hidden">
                    {backgroundImage ? (
                        <>
                            <img
                                src={backgroundImage}
                                alt="Background"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-white/70 z-[5]" />
                            <div
                                className="absolute inset-0 z-10"
                                style={{
                                    background: `linear-gradient(to right, ${getTranslucentColor(0.9)} 0%, ${getTranslucentColor(0.4)} 60%, transparent 100%)`
                                }}
                            />
                        </>
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-white/70 z-[5]" />
                            <div
                                className="absolute inset-0 z-10"
                                style={{
                                    background: `linear-gradient(to right, ${getTranslucentColor(0.9)} 0%, ${getTranslucentColor(0.4)} 60%, transparent 100%)`
                                }}
                            />
                            <Lucide.Image size={120} className="text-slate-400 opacity-20" />
                            <span className="text-slate-400 font-bold text-3xl ml-4 opacity-20 uppercase tracking-widest">
                                Visual Background
                            </span>
                            {/* Abstract shapes to verify overlay visibility */}
                            <div className="absolute right-0 top-0 w-2/3 h-full bg-slate-300 transform skew-x-12 opacity-50" />
                        </>
                    )}
                </div>

                {/* Content Overlay */}
                <div className="relative z-20 max-w-2xl space-y-8">
                    {onUpdate ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Lucide.MapPin size={32} color={accentColor} />
                                <input
                                    value={mainNode?.data.subLabel || ''}
                                    onChange={(e) => handleNodeUpdate(mainNode.id, 'subLabel', e.target.value)}
                                    className="text-teal-400 font-bold tracking-widest uppercase text-xl bg-transparent w-full outline-none focus:ring-1 focus:ring-teal-500 rounded"
                                    placeholder="LOCATION / CONTEXT"
                                />
                            </div>
                            <textarea
                                value={mainNode?.data.label}
                                onChange={(e) => handleNodeUpdate(mainNode.id, 'label', e.target.value)}
                                className="text-6xl font-black text-white leading-none bg-transparent w-full resize-none outline-none focus:ring-1 focus:ring-teal-500 rounded p-2"
                                rows={2}
                            />
                            <textarea
                                value={mainNode?.data.description || ''}
                                onChange={(e) => handleNodeUpdate(mainNode.id, 'description', e.target.value)}
                                className="text-2xl text-slate-200 leading-relaxed bg-transparent w-full resize-none outline-none focus:ring-1 focus:ring-teal-500 rounded p-2"
                                rows={3}
                                placeholder="Description..."
                            />
                        </div>
                    ) : (
                        <>
                            {mainNode?.data.subLabel && (
                                <div className="flex items-center gap-4 text-teal-400 font-bold tracking-widest uppercase text-xl animate-fade-in-up">
                                    <Lucide.MapPin size={32} />
                                    {mainNode.data.subLabel}
                                </div>
                            )}
                            <h2
                                className="text-7xl font-black text-white leading-tight"
                                style={{
                                    textShadow: '0 10px 40px rgba(0,0,0,0.6)',
                                    filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))'
                                }}
                            >
                                {mainNode?.data.label}
                            </h2>
                            {mainNode?.data.description && (
                                <p
                                    className="text-3xl font-semibold text-slate-100 leading-relaxed max-w-2xl"
                                    style={{ textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                                >
                                    {mainNode.data.description}
                                </p>
                            )}
                        </>
                    )}

                    {/* Secondary items (optional) */}
                    {secondaryNodes.length > 0 && (
                        <div className="pt-8 flex gap-6">
                            {secondaryNodes.map(node => (
                                <div key={node.id} className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white min-w-[150px]">
                                    <h5 className="font-bold">{node.data.label}</h5>
                                    <p className="text-sm text-slate-300">{node.data.value || node.data.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Check for full-bleed archetypes
    const isFullBleed = archetype === 'contextual-overlay';

    return (
        <div
            className={`flex flex-col items-center justify-center w-[1920px] h-[1080px] absolute inset-0 ${isFullBleed ? 'p-0' : 'p-12'}`}
            style={{ backgroundColor }}
        >
            {/* Subtle background grid - hide on full bleed */}
            {!isFullBleed && (
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                />
            )}

            {!isFullBleed && renderTitle()}

            <div className={`w-full flex justify-center items-center ${isFullBleed ? 'h-full' : ''}`}>
                {renderNodes()}
            </div>
        </div>
    );
};
