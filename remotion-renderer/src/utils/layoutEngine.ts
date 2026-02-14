import ELK from 'elkjs/lib/elk.bundled';
import { MotionGraph } from '../types/MotionGraph';
import { getNormalizedProcessSize } from './processNodeSizing';

const elk = new ELK();

export const calculateLayout = async (graph: MotionGraph, width: number, height: number): Promise<MotionGraph> => {
    const isHorizontalFlowArchetype =
        graph.archetype === 'process' || graph.archetype === 'cycle' || graph.archetype === 'timeline';
    const normalizedProcessSize = isHorizontalFlowArchetype ? getNormalizedProcessSize(graph.nodes) : null;
    const sizedNodes = graph.nodes.map(node => ({
        ...node,
        nodeSize: isHorizontalFlowArchetype
            ? normalizedProcessSize!
            : (node.nodeSize || { width: 250, height: 180 })
    }));

    // Use deterministic centering for horizontal flows to match editor preview.
    // ELK can include routing extents that visually shift rows off-center.
    if (isHorizontalFlowArchetype) {
        const nodeCount = sizedNodes.length;
        const arrowCount = Math.max(0, nodeCount - 1);
        const arrowSlotWidth = 56;
        const includeCycleReturn = graph.archetype === 'cycle' && nodeCount > 1;
        const cycleReturnWidth = includeCycleReturn ? (arrowSlotWidth + 24) : 0;
        const nodeWidth = normalizedProcessSize!.width;
        const nodeHeight = normalizedProcessSize!.height;
        const rowWidth = (nodeCount * nodeWidth) + (arrowCount * arrowSlotWidth) + cycleReturnWidth;
        const rowHeight = nodeHeight + 24;
        const startX = (width / 2) - (rowWidth / 2);
        const nodeY = ((height / 2) - (rowHeight / 2)) + 12;

        return {
            ...graph,
            nodes: sizedNodes.map((node, index) => ({
                ...node,
                position: {
                    x: startX + (index * (nodeWidth + arrowSlotWidth)),
                    y: nodeY
                }
            })),
            layoutWidth: rowWidth,
            layoutHeight: rowHeight
        };
    }

    // 1. Transform MotionGraph to ELK Graph
    // Helper to get layout options based on archetype
    const getLayoutOptions = (archetype: string) => {
        const defaults = {
            'elk.algorithm': 'layered',
            'elk.direction': 'DOWN',
            'elk.padding': '[top=50,left=50,bottom=50,right=50]',
            'elk.spacing.nodeNode': '100',
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
        children: sizedNodes.map(node => ({
            id: node.id,
            width: node.nodeSize?.width || 250,
            height: node.nodeSize?.height || 180
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
    const rootWidth = (layout as any).width || width;
    const rootHeight = (layout as any).height || height;

    const positionedNodes = sizedNodes.map(node => {
        const layoutNode = layout.children?.find(n => n.id === node.id);

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
        nodes: positionedNodes,
        layoutWidth: rootWidth,
        layoutHeight: rootHeight
    };
};
