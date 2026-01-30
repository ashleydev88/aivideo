export type MotionArchetype = 'process' | 'cycle' | 'hierarchy' | 'comparison' | 'statistic' | 'grid';

export interface MotionNodeData {
    label: string;
    subLabel?: string;
    description?: string;
    icon?: string; // lucide icon name
    variant?: 'neutral' | 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'warning';
    value?: string | number; // Specific for stats
}

export interface MotionNode {
    id: string;
    type: 'motion-card' | 'motion-stat';
    data: MotionNodeData;
    // Position is optional because it might not be present in the initial AI output, 
    // but will be injected by the Layout Engine.
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
