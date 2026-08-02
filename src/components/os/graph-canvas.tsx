import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { FileText, PenLine, Sparkles, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import "@xyflow/react/dist/style.css";
import "./graph-modal.css";

import { useKnowledge } from "@/store/knowledge";
import { getAncestors } from "@/lib/pages";
import type { KnowledgePage } from "@/lib/types";

interface GraphCanvasProps {
  onClose: () => void;
}

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 60 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 30,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export default function GraphCanvas({ onClose }: GraphCanvasProps) {
  const { state, select } = useKnowledge();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(state.activePageId);
  const [mode, setMode] = useState<"overview" | "focus">("overview");

  const pageList = useMemo(() => Object.values(state.pages), [state.pages]);

  const { initialNodes, initialEdges } = useMemo(() => {
    const rawNodes: Node[] = pageList.map((p) => ({
      id: p.id,
      data: { label: p.title || "Untitled", kind: p.kind, icon: p.icon },
      position: { x: 0, y: 0 },
      className: `rounded-xl border px-3 py-2 text-xs font-medium text-white shadow-lg transition-all ${
        p.id === state.activePageId
          ? "border-violet-400 bg-violet-600/30 shadow-violet-500/20"
          : "border-white/10 bg-[#12121a] hover:border-violet-400/40"
      }`,
    }));

    const rawEdges: Edge[] = [];
    pageList.forEach((p) => {
      p.childrenIds.forEach((childId) => {
        rawEdges.push({
          id: `${p.id}-${childId}`,
          source: p.id,
          target: childId,
          animated: true,
          style: { stroke: "rgba(139, 92, 246, 0.4)", strokeWidth: 2 },
        });
      });
    });

    const { nodes, edges } = getLayoutedElements(rawNodes, rawEdges);
    return { initialNodes: nodes, initialEdges: edges };
  }, [pageList, state.activePageId]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const selectedPage = selectedNodeId ? state.pages[selectedNodeId] : null;

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      select(node.id);
      onClose();
    },
    [select, onClose],
  );

  return (
    <div className="relative h-[80vh] w-full overflow-hidden rounded-2xl bg-[#08080c] calm-graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.08)" />
        <Controls className="bg-[#12121a]/90 border-white/10 text-white fill-white" />
        <MiniMap
          nodeColor={() => "#8b5cf6"}
          maskColor="rgba(8, 8, 12, 0.7)"
          className="bg-[#12121a]/90 border-white/10 rounded-xl"
        />
      </ReactFlow>

      {selectedPage && (
        <div className="absolute bottom-4 right-4 z-10 w-64 rounded-xl border border-white/10 bg-[#12121a]/95 p-4 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
              Inspector
            </span>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="text-white/40 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {selectedPage.kind === "whiteboard" ? (
              <PenLine className="size-4 text-violet-300" />
            ) : (
              <FileText className="size-4 text-white/50" />
            )}
            <span className="truncate text-sm font-medium">
              {selectedPage.title || "Untitled"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-white/40">
            {selectedPage.childrenIds.length} sub-page
            {selectedPage.childrenIds.length === 1 ? "" : "s"}
          </p>
          <button
            onClick={() => {
              select(selectedPage.id);
              onClose();
            }}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-500"
          >
            Open Page
          </button>
        </div>
      )}
    </div>
  );
}