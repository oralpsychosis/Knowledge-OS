import { useCallback, useEffect, useMemo, useState } from "react";
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
  useReactFlow,
  Handle,
  Position,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { FileText, PenLine, Sparkles, Target, ChevronRight, ExternalLink } from "lucide-react";
import "@xyflow/react/dist/style.css";
import "./graph-modal.css";

import { useKnowledge } from "@/store/knowledge";
import { getAncestors } from "@/lib/pages";

interface GraphCanvasProps {
  onClose: () => void;
}

/**
 * Custom dark-styled page node for Knowledge OS.
 */
function PageNode({ data, selected }: { data: any; selected: boolean }) {
  const Icon = data.kind === "whiteboard" ? PenLine : FileText;

  return (
    <div
      className={`group relative w-[190px] rounded-xl border px-3 py-2.5 transition-all duration-200 ${
        selected
          ? "border-violet-400 bg-violet-600/25 shadow-[0_0_25px_rgba(139,92,246,0.35)]"
          : "border-white/15 bg-[#111118] hover:border-violet-400/50 hover:bg-[#161622]"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !bg-violet-400 opacity-0"
      />

      <div className="flex items-center gap-2.5">
        <div
          className={`flex size-7 shrink-0 items-center justify-center rounded-lg border ${
            selected
              ? "border-violet-400/50 bg-violet-500/30 text-violet-200"
              : "border-white/10 bg-white/5 text-white/50"
          }`}
        >
          {data.icon ? (
            <span className="text-[13px]">{data.icon}</span>
          ) : (
            <Icon className="size-3.5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-white/90">
            {data.label}
          </div>
          {data.childCount > 0 && (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/40">
              <ChevronRight className="size-2.5 text-violet-400" />
              {data.childCount} sub-page{data.childCount === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !bg-violet-400 opacity-0"
      />
    </div>
  );
}

const nodeTypes = {
  page: PageNode,
};

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "TB",
    nodesep: 60,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 190, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return {
    nodes: nodes.map((node) => {
      const nodeWithPos = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPos ? nodeWithPos.x - 95 : 0,
          y: nodeWithPos ? nodeWithPos.y - 30 : 0,
        },
      };
    }),
    edges,
  };
}

export default function GraphCanvas({ onClose }: GraphCanvasProps) {
  const { state, select } = useKnowledge();
  const { fitView } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(state.activePageId);
  const [mode, setMode] = useState<"overview" | "focus">("overview");

  const pageList = useMemo(() => {
    const all = Object.values(state.pages);
    if (mode === "overview" || !state.activePageId) return all;

    const activeId = state.activePageId;
    const active = state.pages[activeId];
    if (!active) return all;

    const ancestors = getAncestors(state, activeId).map((p) => p.id);
    const siblings = active.parentId
      ? state.pages[active.parentId]?.childrenIds ?? []
      : state.rootOrder;
    const children = active.childrenIds;

    const focusIds = new Set([...ancestors, ...siblings, ...children]);
    return all.filter((p) => focusIds.has(p.id));
  }, [state, mode]);

  const { initialNodes, initialEdges } = useMemo(() => {
    const rawNodes: Node[] = pageList.map((p) => ({
      id: p.id,
      type: "page",
      data: {
        label: p.title || "Untitled",
        kind: p.kind,
        icon: p.icon,
        childCount: p.childrenIds.length,
      },
      position: { x: 0, y: 0 },
    }));

    const rawEdges: Edge[] = [];
    pageList.forEach((p) => {
      p.childrenIds.forEach((childId) => {
        if (pageList.some((node) => node.id === childId)) {
          rawEdges.push({
            id: `${p.id}-${childId}`,
            source: p.id,
            target: childId,
            animated: p.id === state.activePageId || childId === state.activePageId,
            style: {
              stroke:
                p.id === state.activePageId || childId === state.activePageId
                  ? "rgba(167, 139, 250, 0.7)"
                  : "rgba(255, 255, 255, 0.15)",
              strokeWidth: 2,
            },
          });
        }
      });
    });

    return getLayoutedElements(rawNodes, rawEdges);
  }, [pageList, state.activePageId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    const timer = setTimeout(() => {
      fitView({ padding: 0.3, duration: 400 });
    }, 50);
    return () => clearTimeout(timer);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      select(node.id);
      onClose();
    },
    [select, onClose],
  );

  return (
    <div className="calm-graph relative h-[80vh] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#08080c]">
      <div className="absolute left-6 top-6 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("overview")}
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${
            mode === "overview"
              ? "border-violet-400/40 bg-violet-500/20 text-violet-100 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
              : "border-white/10 bg-[#12121a]/90 text-white/40 hover:bg-[#12121a] hover:text-white"
          }`}
        >
          <Sparkles className="size-3.5" />
          Overview ({Object.keys(state.pages).length})
        </button>
        <button
          type="button"
          onClick={() => setMode("focus")}
          disabled={!state.activePageId}
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${
            mode === "focus"
              ? "border-violet-400/40 bg-violet-500/20 text-violet-100 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
              : "border-white/10 bg-[#12121a]/90 text-white/40 hover:bg-[#12121a] hover:text-white disabled:opacity-20"
          }`}
        >
          <Target className="size-3.5" />
          Active Branch
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls
          showInteractive={false}
          className="rounded-xl border-white/10 bg-[#12121a]/95 text-white"
        />
        <MiniMap
          nodeColor={(n) => (n.id === selectedNodeId ? "#8b5cf6" : "#2a2a35")}
          maskColor="rgba(8, 8, 12, 0.85)"
          className="rounded-xl border-white/10 bg-[#12121a]/95"
        />
      </ReactFlow>

      <div className="pointer-events-none absolute bottom-6 left-6 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-[#111118]/90 px-3 py-1.5 text-[11px] text-white/40 backdrop-blur-md">
        <ExternalLink className="size-3 text-violet-300/70" />
        Click any node to navigate to that page directly
      </div>
    </div>
  );
}