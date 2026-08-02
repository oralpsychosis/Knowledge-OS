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
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { FileText, PenLine, Sparkles, X, Target } from "lucide-react";
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
  dagreGraph.setGraph({ rankdir: "TB", nodesep: 70, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 44 });
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
        y: nodeWithPosition.y - 22,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export default function GraphCanvas({ onClose }: GraphCanvasProps) {
  const { state, select } = useKnowledge();
  const { fitView } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(state.activePageId);
  const [mode, setMode] = useState<"overview" | "focus">(state.activePageId ? "focus" : "overview");

  const pageList = useMemo(() => {
    const all = Object.values(state.pages);
    if (mode === "overview" || !state.activePageId) return all;

    const activeId = state.activePageId;
    const active = state.pages[activeId];
    if (!active) return all;

    const ancestors = getAncestors(state, activeId).map((p) => p.id);
    const siblings = active.parentId ? state.pages[active.parentId].childrenIds : state.rootOrder;
    const children = active.childrenIds;

    const focusIds = new Set([...ancestors, ...siblings, ...children]);
    return all.filter((p) => focusIds.has(p.id));
  }, [state, mode]);

  const { initialNodes, initialEdges } = useMemo(() => {
    const rawNodes: Node[] = pageList.map((p) => ({
      id: p.id,
      data: { label: p.title || "Untitled", kind: p.kind, icon: p.icon },
      position: { x: 0, y: 0 },
      className: `rounded-xl border px-3 py-2 text-xs font-medium text-white shadow-lg transition-all ${
        p.id === state.activePageId
          ? "border-violet-400 bg-violet-600/30 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          : "border-white/10 bg-[#12121a]/95 hover:border-violet-400/40"
      }`,
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
                  ? "rgba(167, 139, 250, 0.6)"
                  : "rgba(255, 255, 255, 0.12)",
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

  // Sync nodes and edges when the calculated list changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    // Use a small timeout to ensure React Flow has processed the new nodes before fitting
    const timer = setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
    return () => clearTimeout(timer);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

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
      <div className="absolute left-4 top-4 z-20 flex gap-2">
        <button
          onClick={() => setMode("overview")}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
            mode === "overview"
              ? "border-violet-400/40 bg-violet-500/20 text-violet-100"
              : "border-white/10 bg-white/5 text-white/40 hover:text-white"
          }`}
        >
          <Sparkles className="size-3" />
          Overview
        </button>
        <button
          onClick={() => setMode("focus")}
          disabled={!state.activePageId}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
            mode === "focus"
              ? "border-violet-400/40 bg-violet-500/20 text-violet-100"
              : "border-white/10 bg-white/5 text-white/40 hover:text-white disabled:opacity-20"
          }`}
        >
          <Target className="size-3" />
          Focus
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.05)" />
        <Controls className="bg-[#12121a]/90 border-white/10 text-white fill-white" />
        <MiniMap
          nodeColor={() => "#8b5cf6"}
          maskColor="rgba(8, 8, 12, 0.7)"
          className="bg-[#12121a]/90 border-white/10 rounded-xl"
        />
      </ReactFlow>

      {selectedPage && (
        <div className="absolute bottom-4 right-4 z-10 w-64 rounded-xl border border-white/10 bg-[#12121a]/95 p-4 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
              Page Info
            </span>
            <button onClick={() => setSelectedNodeId(null)} className="text-white/40 hover:text-white">
              <X className="size-3.5" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {selectedPage.kind === "whiteboard" ? (
              <PenLine className="size-4 text-violet-300" />
            ) : (
              <FileText className="size-4 text-white/50" />
            )}
            <span className="truncate text-sm font-medium">{selectedPage.title || "Untitled"}</span>
          </div>
          <p className="mt-1 text-[11px] text-white/40">
            {selectedPage.childrenIds.length} sub-page{selectedPage.childrenIds.length === 1 ? "" : "s"}
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