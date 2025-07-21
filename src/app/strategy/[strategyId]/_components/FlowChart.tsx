import React, { ReactNode, useEffect, useMemo } from 'react';
import {
  Handle,
  MarkerType,
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
    // ranker: 'network-simplex',
    rankdir: 'TB',
    nodesep: 100,
    ranksep: 100,
    marginx: 50,
    marginy: 50,
    align: 'DR',
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
    const baseX = 150;
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
  connectable: boolean;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  type: string;
  style: any;
  marketEnd: any;
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
        style={{
          position: 'relative',
          padding: '10px',
          borderRadius: '25px',
          background: flow.title.includes('/')
            ? `
            linear-gradient(#1A1A1A, #1A1A1A) padding-box,
            linear-gradient(to right, #2E45D0, #B1525C) border-box
          `
            : `
            linear-gradient(#1A1A1A, #1A1A1A) padding-box,
            linear-gradient(to right, #372C57, #B1525C) border-box
          `,
          border: '2px dashed transparent',
          color: 'white',
          fontSize: '12px',
          minHeight: '120px',
          width: '100%',
          height: '100%',
          alignItems: 'end',
          textAlign: 'end',
          fontWeight: '300',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'right',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <Handle
          type="source"
          position={flow.title.includes('/') ? Position.Left : Position.Right}
          style={{
            background: flow.title.includes('/') ? '#B1525C' : '#2E45D0',
            border: '2px solid #1A2B8A',
            width: '10px',
            height: '2px',
            zIndex: 10,
          }}
        />

        <b
          style={{ fontWeight: '700', marginTop: '20px', marginRight: '20px' }}
        >
          {flow.title}
        </b>
        {flow.subItems.map((item) => (
          <div key={item.key} style={{ height: '100%' }}>
            {item.key}{' '}
            <b
              style={{
                fontWeight: '700',
                marginTop: '20px',
                marginRight: '20px',
              }}
            >
              {item.value}
            </b>
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
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      connectable: false,
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
          stroke: 'url(#gradient-edge)',
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
          minZoom={1}
          maxZoom={1}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnDoubleClick={false}
          panOnDrag={false}
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
    <>
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}
      >
        <defs>
          <linearGradient id="gradient-edge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B1525C" />
            <stop offset="100%" stopColor="#2E45D0" />
          </linearGradient>
        </defs>
      </svg>
      <ReactFlowProvider>
        <InternalFlowChart {...props} />
      </ReactFlowProvider>
    </>
  );
}
