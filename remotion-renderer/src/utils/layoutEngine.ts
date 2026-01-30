import ELK from 'elkjs/lib/elk.bundled';
import { MotionGraph, MotionNode, MotionEdge } from '../types/MotionGraph';

const elk = new ELK();

export const calculateLayout = async (graph: MotionGraph, width: number, height: number): Promise<MotionGraph> => {
    // 1. Transform MotionGraph to ELK Graph
    // Helper to get layout options based on archetype
    const getLayoutOptions = (archetype: string) => {
        const defaults = {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.padding': '[top=50,left=50,bottom=50,right=50]',
            'elk.spacing.nodeNode': '60',
            'elk.layered.spacing.nodeNodeBetweenLayers': '80',
        };

        switch (archetype) {
            case 'process':
            case 'cycle':
            case 'timeline':
                return {
                    ...defaults,
                    'elk.direction': 'RIGHT',
                    'elk.spacing.nodeNode': '80'
                };
            case 'funnel':
            case 'pyramid':
                return {
                    ...defaults,
                    'elk.direction': 'DOWN',
                    'elk.spacing.nodeNode': '10' // tight stacking
                };
            case 'mindmap':
                return {
                    ...defaults,
                    'elk.algorithm': 'radial', // Requires elkjs to support radial or we simulate
                    'elk.radial.radius': '200'
                };
            case 'code':
            case 'math':
            case 'architecture':
                return {
                    ...defaults,
                    'elk.direction': 'DOWN',
                };
            case 'matrix':
                return {
                    ...defaults,
                    // Matrix needs a grid layout. ELK 'box' or 'fixed' might work best, but 'layered' with 2 per row is tricky.
                    // We'll trust layered for now, but in reality we might force positions manually in MotionChart if ELK fails.
                    'elk.algorithm': 'mrtree',
                    'elk.spacing.nodeNode': '20'
                };
            case 'metaphor': // Iceberg
                return {
                    ...defaults,
                    'elk.direction': 'DOWN',
                    'elk.spacing.nodeNode': '40'
                };
            case 'anatomy':
                return {
                    ...defaults,
                    'elk.algorithm': 'radial', // Labels around a center?
                    'elk.radial.radius': '300'
                };
            default:
                return defaults;
        }
    };

    const elkGraph = {
        id: 'root',
        layoutOptions: getLayoutOptions(graph.archetype),
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
