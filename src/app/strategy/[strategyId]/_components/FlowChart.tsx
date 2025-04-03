import React, { ReactNode, useEffect, useMemo } from 'react';
import {
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
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
  background: 'var(--chakra-colors-bg)',
  opacity: 0.9,
  color: 'white',
  padding: '10px',
  borderRadius: '5px',
  fontSize: '13px',
  width: '200px',
};

// Dagre layouting
const getLayoutedElements = (nodes: any[], edges: any[]) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    ranker: 'network-simplex',
    rankdir: 'TB',
    nodesep: 30,
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

  const newNodes = nodes.map((node) => {
    const position = g.node(node.id);
    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    const x = position.x - (node.measured?.width ?? 0) / 2;
    const y = position.y - (node.measured?.height ?? 0) / 2;

    return { ...node, position: { x, y } };
  });

  // ensure not more than 3 nodes in a row
  let offset = 0;
  const maxLevels = Math.max(...newNodes.map((n) => n.level));
  for (let i = 0; i <= maxLevels; i++) {
    const nodesInLevel = newNodes.filter((n) => n.level == i);
    const maxInRow = 3;

    const MOVE_BY = 120;

    const totalGap = nodesInLevel.reduce((acc, n, index) => {
      if (index == 0) return 0;
      const prevNode = nodesInLevel[index - 1];
      return acc + (n.position.x - prevNode.position.x);
    }, 0);
    const avgGabBetweenNodes =
      totalGap / (nodesInLevel.length > 1 ? nodesInLevel.length - 1 : 1);

    // increase y of alternate newNodes
    let xOffset = 0;
    for (let j = 0; j < nodesInLevel.length; j += 1) {
      const extra =
        nodesInLevel.length > maxInRow && (j - 1) % 2 == 0 ? MOVE_BY : 0;
      const nodeIndex = newNodes.findIndex((n) => n.id == nodesInLevel[j].id);
      newNodes[nodeIndex].position.y += offset + extra;
      if (nodesInLevel.length > maxInRow) {
        const widthOffset =
          (avgGabBetweenNodes / 2) * (nodesInLevel.length / 2);
        newNodes[nodeIndex].position.x += -xOffset + widthOffset;
        xOffset += avgGabBetweenNodes / 2;
      }
    }
    if (nodesInLevel.length > maxInRow) {
      offset += MOVE_BY;
    }
  }

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
      <div>
        <b>{flow.title}</b>
        <br />
        <table style={{ width: '100%', fontSize: '11px' }}>
          {flow.subItems.map((item) => (
            <tr key={item.key}>
              <td style={{ textAlign: 'right', width: '70%' }}>{item.key}:</td>
              <td style={{ textAlign: 'left', width: '50%' }}>{item.value}</td>
            </tr>
          ))}
        </table>
      </div>
    );
    let style = boxStyle;
    if (flow.style) {
      style = { ...style, ...flow.style };
    }
    const _node: FlowNode = {
      id: `${level}_${nodes.length}`,
      position: { x: 0, y: 0 }, // doesnt matter as we use dagre for layout
      data: { label: reactElement },
      style,
      level,
    };
    if (flow.linkedFlows.length) {
      _node.sourcePosition = Position.Bottom;
    }
    if (parent) {
      _node.targetPosition = Position.Top;
    }
    nodes.push(_node);
    if (parent) {
      edges.push({
        id: `e${parent.id}-${_node.id}`,
        source: parent.id,
        target: _node.id,
        animated: true,
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
      <div style={{ width: '100%', height: '350px' }}>
        <ReactFlow
          fitView
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          // minZoom={1}
          // maxZoom={1}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
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
