import React, { ReactNode, useEffect, useMemo, useRef } from 'react';
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
    const baseY = 50;
    const x = 350;
    let y = 0;

    if (index < 3) {
      y = baseY + index * 100;
      node.sourcePosition = Position.Right;
    } else {
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
  markerEnd: any;
}

let targetHandleId = '0';
let targetHandleCount = 0;

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
            pointerEvents: 'none',
            background: !flow.title.includes('/') ? '#B1525C' : '#2E45D0',
            border: '2px solid #1A2B8A',
            width: '15px',
            height: flow.title.includes('/') ? '40px' : '20px',
            zIndex: 10,
            borderRadius: '40%',
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

    _node.sourcePosition = flow.linkedFlows.length
      ? Position.Right
      : Position.Left;
    _node.targetPosition = parent ? Position.Left : Position.Right;

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
          strokeDasharray: '5,5',
          curveOffset: 50 + targetHandleCount * 10,
        },
        markerEnd: {
          type: MarkerType.Arrow,
          width: 10,
          height: 10,
          color: '#2E45D0',
        },
      });
      targetHandleId = `${targetHandleId}0`;
      targetHandleCount++;
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

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const hasMeasuredNodes = useRef(false);

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

  // Measure nodes and align by right edge after initial render
  useEffect(() => {
    if (nodes.length > 0 && !hasMeasuredNodes.current) {
      // Use setTimeout to ensure nodes are rendered
      setTimeout(() => {
        const baseX = 350;
        const updatedNodes = nodes.map((node, index) => {
          // Get the actual node element to measure its width
          const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
          if (nodeElement) {
            const rect = nodeElement.getBoundingClientRect();
            const nodeWidth = rect.width;
            // Align right edge at baseX by positioning left edge at baseX - nodeWidth
            const newX = baseX - nodeWidth + (index >= 3 ? 400 : 0);
            return {
              ...node,
              position: { x: newX, y: node.position.y },
            };
          }
          return node;
        });
        setNodes(updatedNodes);
        hasMeasuredNodes.current = true;
      }, 0);
    }
  }, [nodes, setNodes]);
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
          onDragStart={() => {}}
          onDragEnd={() => {}}
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
