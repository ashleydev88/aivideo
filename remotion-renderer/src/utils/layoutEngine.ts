import ELK from 'elkjs/lib/elk.bundled';
import { MotionGraph, MotionNode, MotionEdge } from '../types/MotionGraph';

const elk = new ELK();

export const calculateLayout = async (graph: MotionGraph, width: number, height: number): Promise<MotionGraph> => {
    // 1. Transform MotionGraph to ELK Graph
    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': graph.archetype === 'process' || 'cycle' ? 'RIGHT' : 'DOWN',
            'elk.spacing.nodeNode': '80',
            'elk.layered.spacing.nodeNodeBetweenLayers': '100'
        },
        children: graph.nodes.map(node => ({
            id: node.id,
            width: 250, // Standard width for our boxes
            height: 150
        })),
        edges: graph.edges.map(edge => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target]
        }))
    };

    // 2. Run ELK layout
    const layout = await elk.layout(elkGraph);

    // 3. Map positions back to MotionGraph
    const positionedNodes = graph.nodes.map(node => {
        const layoutNode = layout.children?.find(n => n.id === node.id);

        // ELK layout returns width/height on the root node
        const rootWidth = (layout as any).width || width;
        const rootHeight = (layout as any).height || height;

        return {
            ...node,
            position: {
                x: (layoutNode?.x || 0) + (width / 2) - (rootWidth / 2),
                y: (layoutNode?.y || 0) + (height / 2) - (rootHeight / 2)
            }
        };
    });

    return {
        ...graph,
        nodes: positionedNodes
    };
};
