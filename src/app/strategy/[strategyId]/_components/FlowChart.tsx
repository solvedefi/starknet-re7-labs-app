import React, { ReactNode, useEffect, useMemo } from 'react';
import {
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  MarkerType,
} from '@xyflow/react';
import Dagre from '@dagrejs/dagre';
import STRKFarmAtoms, {
  STRKFarmStrategyAPIResult,
} from '@/store/strkfarm.atoms';

import '@xyflow/react/dist/style.css';
import { IInvestmentFlow } from '@strkfarm/sdk';
import { useAtomValue } from 'jotai';
import { Spinner } from '@chakra-ui/react';
// import ELK from 'elkjs/lib/elk.bundled.js';

const boxStyle = {
  color: 'white',
  padding: '10px',
  borderRadius: '25px',
  fontSize: '12px',
  minHeight: '120px',
  width: 'auto',
};

// Dagre layouting
const getLayoutedElements = (nodes: any[], edges: any[]) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    ranker: 'network-simplex',
    rankdir: 'TB',
    nodesep: 100, // Set to 100px as requested
    ranksep: 100,
  });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      width: 200,
      height: node.measured?.height ?? 0,
    }),
  );

  Dagre.layout(g);

  // Custom positioning logic - all nodes in one column
  const newNodes = nodes.map((node, index) => {
    console.log('Node width', node.position);
    const baseX = 200;
    const baseY = 50;
    let x = 0;
    let y = 0;

    if (index < 3) {
      x = baseX;
      y = baseY + index * 100;
      node.sourcePosition = Position.Right;
    } else {
      x = baseX + 400;
      y = baseY + 100;
      node.sourcePosition = Position.Left;
    }

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: newNodes, edges };
};

// const elk = new ELK();

// const useLayoutedElements = (options: any) => {
//   const { getNodes, setNodes, getEdges, fitView } = useReactFlow();
//   console.log('nodes2')
//   const defaultOptions = {
//     "elk.algorithm": "org.eclipse.elk.rectpacking",
//     "elk.padding": "[top=20, left=20, bottom=20, right=20]",
//     "elk.spacing.nodeNode": "30",  // Increase spacing to prevent overlap
//     "elk.spacing.edgeNode": "20",  // Avoid edges covering nodes

//     // 'elk.algorithm': 'layered',
//     // 'elk.layered.spacing.nodeNodeBetweenLayers': 30,
//     // 'elk.spacing.nodeNode': 30,
//     // "elk.layered.spacing.nodeNode": 30
//   };

//   const layoutOptions = { ...defaultOptions, ...options };
//   const graph: any = {
//     id: 'root',
//     layoutOptions: layoutOptions,
//     children: getNodes().map((node) => ({
//       ...node,
//       width: node.measured?.width || 0,
//       height: node.measured?.height || 0,
//       // layoutOptions: { "elk.layered.layerConstraint": "same" }
//     })),
//     edges: getEdges(),
//   };

//   console.log('nodes2', graph)
//   elk.layout(graph).then(({ children }) => {
//     console.log('nodes3', children)
//     // By mutating the children in-place we saves ourselves from creating a
//     // needless copy of the nodes array.
//     children?.forEach((node) => {
//       node.position = { x: node.x, y: node.y };
//     });

//     setNodes(children || []);
//     window.requestAnimationFrame(() => {
//       fitView();
//     });
//   });

// };

interface FlowChartProps {
  strategyId: string;
}

interface FlowNode {
  id: string;
  position: { x: number; y: number };
  data: { label: string | ReactNode };
  style: any;
  level: number;
  targetPosition?: Position;
  sourcePosition?: Position;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
}

function getNodesAndEdges(
  investmentFlows: IInvestmentFlow[],
  parent: FlowNode | null,
  level: number = 0,
) {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  for (const flow of investmentFlows) {
    const reactElement = (
      <div
        style={{ alignItems: 'center', textAlign: 'end', fontWeight: '300' }}
      >
        <b style={{ fontWeight: '700', margin: '10px' }}>{flow.title}</b>
        {flow.subItems.map((item) => (
          <div key={item.key}>
            {item.key} <b style={{ fontWeight: '700' }}>{item.value}</b>
          </div>
        ))}
      </div>
    );
    let style = boxStyle;
    if (flow.style) {
      style = { ...style, ...flow.style };
    }

    const _node: FlowNode = {
      id: flow.id || `${level}_${nodes.length}`,
      position: { x: 0, y: 0 }, // doesnt matter as we use dagre for layout
      data: { label: reactElement },
      style,
      level,
    };
    if (flow.linkedFlows.length) {
      _node.sourcePosition = Position.Right;
    }
    if (parent) {
      _node.targetPosition = Position.Left;
    }
    nodes.push(_node);
    if (parent) {
      edges.push({
        id: `e${parent.id}-${_node.id}`,
        source: parent.id,
        target: _node.id,
        animated: false,
        type: 'smoothstep',
        style: {
          stroke: 'linear-gradient(to right, #2E45D0, #B1525C)',
          strokeWidth: 2,
        },
        marketEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#B1525C',
        },
      });
    }
    const { nodes: _nodes, edges: _edges } = getNodesAndEdges(
      flow.linkedFlows,
      _node,
      level + 1,
    );
    nodes.push(..._nodes);
    edges.push(..._edges);
  }

  return { nodes, edges };
}

function InternalFlowChart(props: FlowChartProps) {
  const strategiesInfo = useAtomValue(STRKFarmAtoms.baseAPRs!);
  const strategyCached = useMemo(() => {
    if (!strategiesInfo || !strategiesInfo.data) return null;
    const strategiesList: STRKFarmStrategyAPIResult[] =
      strategiesInfo.data.strategies;
    return strategiesList.find((s: any) => s.id === props.strategyId);
  }, [strategiesInfo]);

  useEffect(() => {
    if (nodes.length == 0 && strategyCached?.investmentFlows.length) {
      const { nodes: _nodes, edges: _edges } = getNodesAndEdges(
        strategyCached?.investmentFlows || [],
        null,
      );
      const { nodes, edges } = getLayoutedElements(_nodes, _edges);
      setNodes(nodes);
      setEdges(edges);
    }
  }, [strategyCached]);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  // useLayoutedElements({
  //   'elk.algorithm': 'org.eclipse.elk.rectpacking',
  // });

  const proOptions = { hideAttribution: true };

  if (strategyCached && strategyCached.investmentFlows.length == 0) {
    return null;
  }

  if (strategyCached && strategyCached.investmentFlows.length > 0)
    return (
      <div style={{ width: '100%', height: '400px' }}>
        <ReactFlow
          // fitView
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          // minZoom={1}
          // maxZoom={1}
          // nodesDraggable={false}
          nodesConnectable={false}
          // elementsSelectable={false}
          // panOnScroll={false}
          // zoomOnScroll={false}
          // zoomOnDoubleClick={false}
          // panOnDrag={false}
          proOptions={proOptions}
        />
      </div>
    );

  return (
    <div>
      <Spinner size={'sm'} />
    </div>
  );
}

export default function FlowChart(props: FlowChartProps) {
  return (
    <ReactFlowProvider>
      <InternalFlowChart {...props} />
    </ReactFlowProvider>
  );
}
