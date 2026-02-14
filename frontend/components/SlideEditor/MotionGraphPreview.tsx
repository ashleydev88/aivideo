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
import { MotionGraph, getVariantColor } from '@/lib/types/MotionGraph';
import { PreviewMotionBox, PreviewStatBox } from './PreviewMotionBox';
import RichTextEditor from './RichTextEditor';
import { getNormalizedProcessSize } from '@/lib/utils/processNodeSizing';

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
    const icons = Lucide as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; className?: string; strokeWidth?: number }>>;
    return icons[pascalCase] || Lucide.Box;
};

export const MotionGraphPreview: React.FC<MotionGraphPreviewProps> = ({
    data,
    accentColor = '#14b8a6',
    backgroundColor = '#f8fafc',
    textColor = '#0f172a',
    backgroundImage,
    onUpdate,
}) => {
    const flowViewportRef = React.useRef<HTMLDivElement | null>(null);
    const [flowViewport, setFlowViewport] = React.useState({ width: 1600, height: 700 });

    React.useEffect(() => {
        const element = flowViewportRef.current;
        if (!element || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
                setFlowViewport({ width, height });
            }
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

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
    const renderTitle = (floating = false) => {
        if (!title) return null;
        const isHtml = /<[a-z][\s\S]*>/i.test(title);

        return (
            <div className={`w-full flex flex-col items-center justify-center ${floating ? '' : 'mb-16'}`}>
                {onUpdate ? (
                    <div className="motion-graph-title text-7xl font-black tracking-tight uppercase text-center max-w-7xl mx-auto" style={{ color: textColor }}>
                        <RichTextEditor
                            value={title}
                            onChange={handleTitleUpdate}
                            variant="minimal"
                        />
                    </div>
                ) : (
                    <div
                        className="text-7xl font-black tracking-tight uppercase text-center max-w-7xl mx-auto"
                        style={{ color: textColor }}
                    >
                        {isHtml ? (
                            <div className="motion-graph-title prose prose-2xl max-w-none dark:prose-invert">
                                <style>{`
                                    .motion-graph-title h1,
                                    .motion-graph-title h2,
                                    .motion-graph-title h3,
                                    .motion-graph-title p { margin: 0; font-size: inherit; font-weight: inherit; }
                                    .motion-graph-title strong { color: ${accentColor}; }
                                `}</style>
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
        const normalizedProcessSize = getNormalizedProcessSize(nodes);
        const arrowCount = Math.max(0, nodeCount - 1);
        const includeCycleReturn = archetype === 'cycle' && nodeCount > 1;

        // Keep process rows inside a visual safe area so they appear centered
        // within the editable slide region (away from side controls / logo zone).
        const safeHorizontalPadding = 440; // 220px each side
        const safeVerticalPadding = 220; // top+bottom combined
        const availableWidth = Math.max(400, flowViewport.width - safeHorizontalPadding);
        const availableHeight = Math.max(220, flowViewport.height - safeVerticalPadding);

        const arrowSlotWidth = 56;
        const cycleReturnWidth = includeCycleReturn ? (arrowSlotWidth + 24) : 0;
        const minRequiredWidth = (nodeCount * normalizedProcessSize.width) + (arrowCount * arrowSlotWidth) + cycleReturnWidth;
        const requiredHeight = normalizedProcessSize.height + 24;

        // Scale the full row so both dimensions fit inside the slide viewport.
        const fitScale = Math.min(1, availableWidth / minRequiredWidth, availableHeight / requiredHeight);
        const scale = Math.max(0.35, fitScale);
        const rowWidth = minRequiredWidth;
        const rowHeight = requiredHeight;
        const iconSize = 48;

        return (
            <div
                className="w-full flex items-center justify-center"
                style={{ height: `${rowHeight * scale}px` }}
            >
                <div
                    className="relative flex items-center justify-center"
                    style={{
                        width: `${rowWidth * scale}px`,
                        height: `${(rowHeight * scale) + 6}px`,
                        overflow: 'visible'
                    }}
                >
                    <div
                        className="flex flex-row items-center origin-left-top"
                        style={{
                            width: `${rowWidth}px`,
                            height: `${rowHeight}px`,
                            transform: `scale(${scale})`
                        }}
                    >
                        {nodes.map((node, i) => (
                            <React.Fragment key={node.id}>
                                <PreviewMotionBox
                                    label={node.data.label}
                                    subLabel={node.data.subLabel}
                                    description={node.data.description}
                                    icon={node.data.icon}
                                    variant={node.data.variant}
                                    isEditable={!!onUpdate}
                                    onUpdate={(field, val) => handleNodeUpdate(node.id, field, val)}
                                    width={normalizedProcessSize.width}
                                    height={normalizedProcessSize.height}
                                />
                                {i < nodeCount - 1 && (
                                    <div
                                        className="flex items-center justify-center"
                                        style={{ width: `${arrowSlotWidth}px`, minWidth: `${arrowSlotWidth}px` }}
                                    >
                                        <Lucide.ArrowRight size={iconSize} color={textColor + 'aa'} strokeWidth={3} />
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                        {includeCycleReturn && (
                            <div className="flex items-center justify-center ml-6" style={{ width: `${arrowSlotWidth}px` }}>
                                <Lucide.RotateCcw size={iconSize} color={accentColor} strokeWidth={3} />
                            </div>
                        )}
                    </div>
                </div>
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
        const iconSize = Math.round(40 * clampedScale);
        const iconContainerPadding = Math.round(16 * clampedScale);
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
                                    <div className="font-black text-slate-800" style={{ fontSize: `${labelFontSize}px` }}>
                                        <RichTextEditor
                                            value={node.data.label}
                                            onChange={(value) => handleNodeUpdate(node.id, 'label', value)}
                                            variant="minimal"
                                        />
                                    </div>
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
                                        <div className="text-slate-500 mt-1" style={{ fontSize: `${descFontSize}px` }}>
                                            <RichTextEditor
                                                value={node.data.description || ''}
                                                onChange={(value) => handleNodeUpdate(node.id, 'description', value)}
                                                variant="minimal"
                                            />
                                        </div>
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
                                        <div className="font-black text-slate-800 bg-transparent w-full min-w-0 flex-1" style={{ fontSize: `${labelFontSize}px` }}>
                                            <RichTextEditor
                                                value={node.data.label}
                                                onChange={(value) => handleNodeUpdate(node.id, 'label', value)}
                                                variant="minimal"
                                            />
                                        </div>
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
                                        <div className="text-slate-500 mt-2 leading-relaxed bg-transparent w-full flex-1" style={{ fontSize: `${descFontSize}px` }}>
                                            <RichTextEditor
                                                value={node.data.description || ''}
                                                onChange={(value) => handleNodeUpdate(node.id, 'description', value)}
                                                variant="minimal"
                                            />
                                        </div>
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
                            <div className="text-teal-400 text-2xl font-mono bg-transparent w-full">
                                <RichTextEditor
                                    value={node.data.label}
                                    onChange={(value) => handleNodeUpdate(node.id, 'label', value)}
                                    variant="minimal"
                                />
                            </div>
                        ) : (
                            <span className="text-teal-400 text-2xl font-mono">{node.data.label}</span>
                        )}
                    </div>
                    {onUpdate ? (
                        <div className="text-slate-100 font-mono text-2xl w-full bg-transparent">
                            <RichTextEditor
                                value={node.data.description || ''}
                                onChange={(value) => handleNodeUpdate(node.id, 'description', value)}
                                variant="minimal"
                            />
                        </div>
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
                                <div className="font-black text-slate-800 text-2xl bg-transparent w-full text-center">
                                    <RichTextEditor
                                        value={node.data.label}
                                        onChange={(value) => handleNodeUpdate(node.id, 'label', value)}
                                        variant="minimal"
                                    />
                                </div>
                            ) : (
                                <h4 className="font-black text-slate-800 text-2xl">{node.data.label}</h4>
                            )}

                            {(node.data.subLabel || onUpdate) && (
                                onUpdate ? (
                                    <div className="text-lg text-slate-500 mt-2 bg-transparent w-full text-center">
                                        <RichTextEditor
                                            value={node.data.subLabel || ''}
                                            onChange={(value) => handleNodeUpdate(node.id, 'subLabel', value)}
                                            variant="minimal"
                                        />
                                    </div>
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
            {nodes.slice(0, 4).map((node) => {
                const color = getVariantColor(node.data.variant, accentColor);
                return (
                    <div
                        key={node.id}
                        className="bg-white rounded-3xl shadow-lg p-10 text-center border-t-8"
                        style={{ borderTopColor: color }}
                    >
                        <h4 className="font-black text-slate-800 text-3xl">
                            {onUpdate ? (
                                <div className="bg-transparent w-full text-center">
                                    <RichTextEditor
                                        value={node.data.label}
                                        onChange={(value) => handleNodeUpdate(node.id, 'label', value)}
                                        variant="minimal"
                                    />
                                </div>
                            ) : (
                                node.data.label
                            )}
                        </h4>
                        {(node.data.description || onUpdate) && (
                            <div className="text-xl text-slate-500 mt-4 leading-relaxed">
                                {onUpdate ? (
                                    <div className="bg-transparent w-full text-center">
                                        <RichTextEditor
                                            value={node.data.description || ''}
                                            onChange={(value) => handleNodeUpdate(node.id, 'description', value)}
                                            variant="minimal"
                                        />
                                    </div>
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
                                    <div className="font-bold text-slate-700 text-2xl bg-transparent w-full">
                                        <RichTextEditor
                                            value={node.data.label}
                                            onChange={(value) => handleNodeUpdate(node.id, 'label', value)}
                                            variant="minimal"
                                        />
                                    </div>
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
                                    <div className="font-bold text-slate-700 text-2xl bg-transparent w-full">
                                        <RichTextEditor
                                            value={node.data.label}
                                            onChange={(value) => handleNodeUpdate(node.id, 'label', value)}
                                            variant="minimal"
                                        />
                                    </div>
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
                        <div className="font-black text-slate-800 text-4xl bg-transparent w-full text-center">
                            <RichTextEditor
                                value={centerNode?.data.label || ''}
                                onChange={(value) => handleNodeUpdate(centerNode.id, 'label', value)}
                                variant="minimal"
                            />
                        </div>
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
                                <div className="font-bold text-slate-700 bg-transparent w-full text-center">
                                    <RichTextEditor
                                        value={node.data.label}
                                        onChange={(value) => handleNodeUpdate(node.id, 'label', value)}
                                        variant="minimal"
                                    />
                                </div>
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
                            <div className="font-black text-5xl text-slate-800 leading-tight w-full bg-transparent">
                                <RichTextEditor
                                    value={quoteNode?.data.label || ''}
                                    onChange={(value) => handleNodeUpdate(quoteNode.id, 'label', value)}
                                    variant="minimal"
                                />
                            </div>
                        ) : (
                            <blockquote className="font-black text-5xl text-slate-800 leading-tight">
                                &ldquo;{parse(quoteNode?.data.label || '')}&rdquo;
                            </blockquote>
                        )}

                        <div className="flex items-center gap-4 border-t pt-8" style={{ borderColor: color + '40' }}>
                            <div className="w-16 h-1 w-16 rounded-full" style={{ backgroundColor: color }} />
                            {onUpdate ? (
                                <div className="w-full flex flex-col gap-2">
                                    <div className="font-bold text-slate-600 text-2xl bg-transparent">
                                        <RichTextEditor
                                            value={quoteNode?.data.subLabel || ''}
                                            onChange={(value) => handleNodeUpdate(quoteNode.id, 'subLabel', value)}
                                            variant="minimal"
                                        />
                                    </div>
                                    <div className="text-slate-400 text-xl bg-transparent">
                                        <RichTextEditor
                                            value={quoteNode?.data.description || ''}
                                            onChange={(value) => handleNodeUpdate(quoteNode.id, 'description', value)}
                                            variant="minimal"
                                        />
                                    </div>
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
        if (!mainNode) return null;

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
                        <div className="space-y-6 contextual-overlay-editor">
                            <style>{`
                                .contextual-overlay-editor .ProseMirror {
                                    --editor-default-size: 24px;
                                }
                                .contextual-overlay-editor .kicker .ProseMirror p {
                                    text-transform: uppercase !important;
                                    letter-spacing: 0.2em !important;
                                    font-size: 24px !important;
                                    font-weight: 800 !important;
                                    margin: 0 !important;
                                }
                                .contextual-overlay-editor .headline .ProseMirror p,
                                .contextual-overlay-editor .headline .ProseMirror h1,
                                .contextual-overlay-editor .headline .ProseMirror h2 {
                                    font-size: 96px !important;
                                    line-height: 1.05 !important;
                                    font-weight: 950 !important;
                                    margin: 0 !important;
                                    text-shadow: 0 10px 40px rgba(0,0,0,0.6) !important;
                                }
                                .contextual-overlay-editor .description .ProseMirror p {
                                    font-size: 42px !important;
                                    line-height: 1.45 !important;
                                    font-weight: 600 !important;
                                    margin: 0 !important;
                                    color: #e2e8f0 !important;
                                    text-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
                                }
                            `}</style>
                            <div className="flex items-start gap-4 text-white">
                                <Lucide.MapPin size={32} className="mt-3" />
                                <div className="kicker w-full">
                                    <RichTextEditor
                                        value={mainNode?.data.subLabel || ''}
                                        onChange={(value) => handleNodeUpdate(mainNode.id, 'subLabel', value)}
                                        variant="minimal"
                                    />
                                </div>
                            </div>
                            <div className="headline text-white">
                                <RichTextEditor
                                    value={mainNode?.data.label || ''}
                                    onChange={(value) => handleNodeUpdate(mainNode.id, 'label', value)}
                                    variant="minimal"
                                />
                            </div>
                            <div className="description text-slate-200">
                                <RichTextEditor
                                    value={mainNode?.data.description || ''}
                                    onChange={(value) => handleNodeUpdate(mainNode.id, 'description', value)}
                                    variant="minimal"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            {mainNode?.data.subLabel && (
                                <div className="flex items-center gap-4 text-white font-bold tracking-widest uppercase text-xl animate-fade-in-up">
                                    <Lucide.MapPin size={32} />
                                    <div>{parse(mainNode.data.subLabel)}</div>
                                </div>
                            )}
                            <div
                                className="text-7xl font-black text-white leading-tight"
                                style={{
                                    textShadow: '0 10px 40px rgba(0,0,0,0.6)',
                                    filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))'
                                }}
                            >
                                {parse(mainNode?.data.label || '')}
                            </div>
                            {mainNode?.data.description && (
                                <div
                                    className="text-3xl font-semibold text-slate-100 leading-relaxed max-w-2xl"
                                    style={{ textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                                >
                                    {parse(mainNode.data.description)}
                                </div>
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
    const isHorizontalFlow = archetype === 'process' || archetype === 'cycle' || archetype === 'timeline';

    return (
        <div
            className={`relative flex flex-col items-center justify-center w-[1920px] h-[1080px] absolute inset-0 ${isFullBleed ? 'p-0' : 'p-12'}`}
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

            {!isFullBleed && !isHorizontalFlow && renderTitle()}
            {!isFullBleed && isHorizontalFlow && (
                <div className="absolute top-20 left-0 right-0 z-10 flex justify-center">
                    {renderTitle(true)}
                </div>
            )}

            <div
                ref={flowViewportRef}
                className={`w-full flex justify-center items-center ${isFullBleed ? 'h-full' : 'h-full'}`}
            >
                {renderNodes()}
            </div>
        </div>
    );
};
