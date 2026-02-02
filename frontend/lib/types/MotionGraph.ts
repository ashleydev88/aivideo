/**
 * MotionGraph Types
 * 
 * Mirrors the Remotion MotionGraph.ts types for frontend preview rendering.
 * Keep in sync with: remotion-renderer/src/types/MotionGraph.ts
 */

export type MotionArchetype =
    | 'process' | 'cycle' | 'hierarchy' | 'comparison' | 'statistic' | 'grid'
    | 'timeline' | 'funnel' | 'pyramid' | 'mindmap'
    | 'code' | 'math' | 'architecture'
    | 'matrix' | 'metaphor' | 'anatomy'
    | 'document-anchor' | 'contextual-overlay';

export interface MotionNodeData {
    label: string;
    subLabel?: string;
    description?: string;
    icon?: string; // lucide icon name (kebab-case)
    variant?: 'neutral' | 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'warning';
    value?: string | number;
    image?: string; // For statistic nodes
}

export interface MotionNode {
    id: string;
    type: 'motion-card' | 'motion-stat';
    data: MotionNodeData;
    position?: { x: number; y: number };
}

export interface MotionEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
}

export interface MotionGraph {
    id: string;
    archetype: MotionArchetype;
    nodes: MotionNode[];
    edges: MotionEdge[];
    metadata?: {
        title?: string;
        description?: string;
    };
}

/**
 * Variant to color mapping (matches Remotion's getColor functions)
 */
export const variantColors: Record<string, string> = {
    positive: '#22c55e',
    negative: '#ef4444',
    warning: '#f59e0b',
    accent: '#8b5cf6',
    primary: '#3b82f6',
    secondary: '#64748b',
    neutral: '#94a3b8',
};

export const getVariantColor = (variant?: string, fallback: string = '#94a3b8'): string => {
    return variantColors[variant || 'neutral'] || fallback;
};
