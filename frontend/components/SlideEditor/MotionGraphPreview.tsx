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
            default:
                return renderGrid();
        }
    };

    // Horizontal flow (process, cycle, timeline)
    const renderHorizontalFlow = () => (
        <div className="flex flex-row items-center justify-center gap-8 w-full px-12 flex-wrap">
            {nodes.map((node, i) => (
                <React.Fragment key={node.id}>
                    {i > 0 && (
                        <div className="flex-shrink-0">
                            <Lucide.ArrowRight size={48} color={textColor + 'aa'} strokeWidth={3} />
                        </div>
                    )}
                    <PreviewMotionBox
                        label={node.data.label}
                        subLabel={node.data.subLabel}
                        icon={node.data.icon}
                        variant={node.data.variant}
                        isEditable={!!onUpdate}
                        onUpdate={(field, val) => handleNodeUpdate(node.id, field, val)}
                    />
                </React.Fragment>
            ))}
            {archetype === 'cycle' && nodes.length > 1 && (
                <div className="flex-shrink-0">
                    <Lucide.RotateCcw size={48} color={accentColor} strokeWidth={3} />
                </div>
            )}
        </div>
    );

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
                                        className="font-bold text-slate-800 bg-transparent w-full outline-none focus:bg-slate-50 rounded"
                                        style={{ fontSize: `${labelFontSize}px` }}
                                    />
                                ) : (
                                    <h4
                                        className="font-bold text-slate-800"
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
                style={{ gap: `${gap}px` }}
            >
                {nodes.map((node) => {
                    const color = getVariantColor(node.data.variant, accentColor);
                    return (
                        <div
                            key={node.id}
                            className="bg-white shadow-lg flex items-start border-l-8"
                            style={{
                                borderLeftColor: color,
                                padding: `${padding}px`,
                                gap: `${padding}px`,
                                borderRadius: `${borderRadius}px`,
                            }}
                        >
                            <div
                                className="rounded-2xl flex-shrink-0"
                                style={{
                                    backgroundColor: color + '15',
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
                                        className="font-bold text-slate-800 bg-transparent w-full outline-none focus:bg-slate-50 rounded"
                                        style={{ fontSize: `${labelFontSize}px` }}
                                    />
                                ) : (
                                    <h4
                                        className="font-bold text-slate-800"
                                        style={{ fontSize: `${labelFontSize}px` }}
                                    >
                                        {node.data.label}
                                    </h4>
                                )}

                                {(node.data.description || onUpdate) && (
                                    onUpdate ? (
                                        <textarea
                                            value={node.data.description || ''}
                                            onChange={(e) => handleNodeUpdate(node.id, 'description', e.target.value)}
                                            className="text-slate-500 mt-2 leading-relaxed bg-transparent w-full resize-none outline-none focus:bg-slate-50 rounded"
                                            style={{ fontSize: `${descFontSize}px` }}
                                            rows={2}
                                            placeholder="Description"
                                        />
                                    ) : (
                                        <p
                                            className="text-slate-500 mt-2 leading-relaxed line-clamp-2"
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

        return (
            <div className="relative w-[1000px] h-[1000px] flex items-center justify-center">
                {/* Center node */}
                <div className="absolute z-10">
                    <PreviewMotionBox
                        label={centerNode.data.label}
                        icon={centerNode.data.icon}
                        variant={centerNode.data.variant || 'primary'}
                        isEditable={!!onUpdate}
                        onUpdate={(field, val) => handleNodeUpdate(centerNode.id, field, val)}
                    />
                </div>

                {/* Orbit nodes */}
                {orbitNodes.map((node, i) => {
                    const angle = (i / orbitNodes.length) * 2 * Math.PI - Math.PI / 2;
                    const x = Math.cos(angle) * 350;
                    const y = Math.sin(angle) * 350;

                    return (
                        <div
                            key={node.id}
                            className="absolute"
                            style={{
                                left: 500 + x - 160,
                                top: 500 + y - 80,
                            }}
                        >
                            <PreviewMotionBox
                                label={node.data.label}
                                icon={node.data.icon}
                                variant={node.data.variant}
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
                                    className="font-bold text-slate-800 text-2xl bg-transparent w-full text-center outline-none focus:bg-slate-50 rounded"
                                />
                            ) : (
                                <h4 className="font-bold text-slate-800 text-2xl">{node.data.label}</h4>
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
                        <h4 className="font-bold text-slate-800 text-3xl">
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
                    <h4 className="text-blue-600 font-bold mb-6 flex items-center gap-4 text-3xl">
                        <Lucide.Eye size={32} /> Visible
                    </h4>
                    <div className="space-y-4">
                        {surfaceNodes.map(node => (
                            <div key={node.id} className="bg-white rounded-2xl p-6 shadow-sm">
                                {onUpdate ? (
                                    <input
                                        value={node.data.label}
                                        onChange={(e) => handleNodeUpdate(node.id, 'label', e.target.value)}
                                        className="font-medium text-slate-700 text-2xl bg-transparent w-full outline-none focus:bg-slate-50 rounded"
                                    />
                                ) : (
                                    <span className="font-medium text-slate-700 text-2xl">{node.data.label}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deep level */}
                <div className="bg-slate-100 rounded-3xl p-8 border-l-8 border-slate-500">
                    <h4 className="text-slate-600 font-bold mb-6 flex items-center gap-4 text-3xl">
                        <Lucide.EyeOff size={32} /> Hidden
                    </h4>
                    <div className="space-y-4">
                        {deepNodes.map(node => (
                            <div key={node.id} className="bg-white rounded-2xl p-6 shadow-sm">
                                {onUpdate ? (
                                    <input
                                        value={node.data.label}
                                        onChange={(e) => handleNodeUpdate(node.id, 'label', e.target.value)}
                                        className="font-medium text-slate-700 text-2xl bg-transparent w-full outline-none focus:bg-slate-50 rounded"
                                    />
                                ) : (
                                    <span className="font-medium text-slate-700 text-2xl">{node.data.label}</span>
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
                            className="font-bold text-slate-800 text-4xl bg-transparent w-full text-center outline-none focus:bg-slate-50 rounded"
                        />
                    ) : (
                        <h3 className="font-bold text-slate-800 text-4xl">{centerNode?.data.label}</h3>
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
                                    className="font-medium text-slate-700 bg-transparent w-full text-center outline-none focus:bg-slate-50 rounded"
                                />
                            ) : (
                                <span className="font-medium text-slate-700">{node.data.label}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div
            className="flex flex-col items-center justify-center p-12 w-[1920px] h-[1080px] absolute inset-0"
            style={{ backgroundColor }}
        >
            {/* Subtle background grid */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

            {renderTitle()}

            <div className="w-full flex justify-center items-center">
                {renderNodes()}
            </div>
        </div>
    );
};
