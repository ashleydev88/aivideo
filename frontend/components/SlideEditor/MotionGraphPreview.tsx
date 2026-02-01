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
            <div
                className="text-5xl font-black mb-12 tracking-tight uppercase text-center max-w-4xl mx-auto"
                style={{ color: textColor }}
            >
                {isHtml ? (
                    <div className="prose prose-xl max-w-none dark:prose-invert">
                        <style>{`h1, h2, h3, p { margin: 0; font-size: inherit; font-weight: inherit; } strong { color: ${accentColor}; }`}</style>
                        {parse(title)}
                    </div>
                ) : (
                    title
                )}
                <div className="h-2 w-24 mt-4 mx-auto rounded-full" style={{ backgroundColor: accentColor }} />
            </div>
        );
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
        <div className="flex flex-row items-center justify-center gap-4 w-full px-8 flex-wrap">
            {nodes.map((node, i) => (
                <React.Fragment key={node.id}>
                    {i > 0 && (
                        <div className="flex-shrink-0">
                            <Lucide.ArrowRight size={32} color={textColor + 'aa'} strokeWidth={3} />
                        </div>
                    )}
                    <PreviewMotionBox
                        label={node.data.label}
                        subLabel={node.data.subLabel}
                        icon={node.data.icon}
                        variant={node.data.variant}
                    />
                </React.Fragment>
            ))}
            {archetype === 'cycle' && nodes.length > 1 && (
                <div className="flex-shrink-0">
                    <Lucide.RotateCcw size={32} color={accentColor} strokeWidth={3} />
                </div>
            )}
        </div>
    );

    // Vertical stack (hierarchy, funnel, pyramid)
    const renderVerticalStack = () => {
        const isFunnelOrPyramid = archetype === 'funnel' || archetype === 'pyramid';

        return (
            <div className="flex flex-col items-center justify-center gap-3 w-full max-w-3xl">
                {nodes.map((node, i) => {
                    const widthPercent = isFunnelOrPyramid
                        ? (archetype === 'funnel' ? 100 - (i * 12) : 100 - (i * 15))
                        : 100;
                    const color = getVariantColor(node.data.variant, accentColor);

                    return (
                        <div
                            key={node.id}
                            className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4 border-l-4"
                            style={{
                                width: `${widthPercent}%`,
                                borderLeftColor: color
                            }}
                        >
                            <div className="p-2 rounded-lg" style={{ backgroundColor: color + '20' }}>
                                {React.createElement(getIcon(node.data.icon), { size: 24, color })}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{node.data.label}</h4>
                                {node.data.description && (
                                    <p className="text-sm text-slate-500 line-clamp-1">{node.data.description}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Grid layout (grid, comparison)
    const renderGrid = () => (
        <div className="grid grid-cols-2 gap-6 w-full max-w-4xl px-6">
            {nodes.map((node) => {
                const color = getVariantColor(node.data.variant, accentColor);
                return (
                    <div
                        key={node.id}
                        className="bg-white p-5 rounded-2xl shadow-lg flex items-start gap-4 border-l-4"
                        style={{ borderLeftColor: color }}
                    >
                        <div className="p-3 rounded-xl" style={{ backgroundColor: color + '15' }}>
                            {React.createElement(getIcon(node.data.icon), { size: 28, color })}
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-800">{node.data.label}</h4>
                            {node.data.description && (
                                <p className="text-sm text-slate-500 mt-1">{node.data.description}</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // Statistics display
    const renderStats = () => (
        <div className="flex flex-row gap-8 justify-center w-full flex-wrap">
            {nodes.map((node) => (
                <PreviewStatBox
                    key={node.id}
                    label={node.data.label}
                    description={node.data.description}
                    value={node.data.value}
                    variant={node.data.variant}
                />
            ))}
        </div>
    );

    // Radial layout (mindmap)
    const renderRadial = () => {
        const centerNode = nodes[0];
        const orbitNodes = nodes.slice(1);

        return (
            <div className="relative w-[400px] h-[400px] flex items-center justify-center">
                {/* Center node */}
                <div className="absolute z-10">
                    <PreviewMotionBox
                        label={centerNode.data.label}
                        icon={centerNode.data.icon}
                        variant={centerNode.data.variant || 'primary'}
                    />
                </div>

                {/* Orbit nodes */}
                {orbitNodes.map((node, i) => {
                    const angle = (i / orbitNodes.length) * 2 * Math.PI - Math.PI / 2;
                    const x = Math.cos(angle) * 150;
                    const y = Math.sin(angle) * 150;

                    return (
                        <div
                            key={node.id}
                            className="absolute"
                            style={{
                                left: 200 + x - 70,
                                top: 200 + y - 40,
                            }}
                        >
                            <PreviewMotionBox
                                label={node.data.label}
                                icon={node.data.icon}
                                variant={node.data.variant}
                                className="scale-75"
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    // Code/Math display
    const renderCodeMath = () => (
        <div className="w-full max-w-3xl space-y-4">
            {nodes.map((node) => (
                <div key={node.id} className="bg-slate-800 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Lucide.Code size={16} className="text-teal-400" />
                        <span className="text-teal-400 text-sm font-mono">{node.data.label}</span>
                    </div>
                    <pre className="text-slate-100 font-mono text-sm overflow-x-auto">
                        {node.data.description || '// code here'}
                    </pre>
                </div>
            ))}
        </div>
    );

    // Architecture diagram
    const renderArchitecture = () => (
        <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
            <div className="flex flex-row gap-4 flex-wrap justify-center">
                {nodes.map((node) => {
                    const color = getVariantColor(node.data.variant, accentColor);
                    return (
                        <div
                            key={node.id}
                            className="bg-white rounded-xl shadow-lg p-4 border-2 min-w-[150px] text-center"
                            style={{ borderColor: color }}
                        >
                            <div className="flex justify-center mb-2">
                                {React.createElement(getIcon(node.data.icon), { size: 28, color })}
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm">{node.data.label}</h4>
                            {node.data.subLabel && (
                                <p className="text-xs text-slate-500">{node.data.subLabel}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // 2x2 Matrix
    const renderMatrix = () => (
        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
            {nodes.slice(0, 4).map((node, i) => {
                const color = getVariantColor(node.data.variant, accentColor);
                return (
                    <div
                        key={node.id}
                        className="bg-white rounded-xl shadow-lg p-5 text-center border-t-4"
                        style={{ borderTopColor: color }}
                    >
                        <h4 className="font-bold text-slate-800">{node.data.label}</h4>
                        {node.data.description && (
                            <p className="text-sm text-slate-500 mt-1">{node.data.description}</p>
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
            <div className="w-full max-w-3xl space-y-6">
                {/* Surface level */}
                <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-400">
                    <h4 className="text-blue-600 font-bold mb-3 flex items-center gap-2">
                        <Lucide.Eye size={16} /> Visible
                    </h4>
                    <div className="space-y-2">
                        {surfaceNodes.map(node => (
                            <div key={node.id} className="bg-white rounded-lg p-3 shadow-sm">
                                <span className="font-medium text-slate-700">{node.data.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deep level */}
                <div className="bg-slate-100 rounded-xl p-4 border-l-4 border-slate-500">
                    <h4 className="text-slate-600 font-bold mb-3 flex items-center gap-2">
                        <Lucide.EyeOff size={16} /> Hidden
                    </h4>
                    <div className="space-y-2">
                        {deepNodes.map(node => (
                            <div key={node.id} className="bg-white rounded-lg p-3 shadow-sm">
                                <span className="font-medium text-slate-700">{node.data.label}</span>
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
            <div className="relative w-[500px] h-[350px] flex items-center justify-center">
                {/* Center subject */}
                <div className="bg-white rounded-2xl shadow-xl p-6 z-10 text-center">
                    {React.createElement(getIcon(centerNode?.data.icon), {
                        size: 48,
                        color: accentColor,
                        className: 'mx-auto mb-2'
                    })}
                    <h3 className="font-bold text-slate-800 text-lg">{centerNode?.data.label}</h3>
                </div>

                {/* Label callouts */}
                {labelNodes.map((node, i) => {
                    const positions = [
                        { left: 20, top: 30 },
                        { right: 20, top: 30 },
                        { left: 20, bottom: 30 },
                        { right: 20, bottom: 30 },
                    ];
                    const pos = positions[i % positions.length];

                    return (
                        <div
                            key={node.id}
                            className="absolute bg-white rounded-lg shadow-md p-2 text-sm"
                            style={pos}
                        >
                            <span className="font-medium text-slate-700">{node.data.label}</span>
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
