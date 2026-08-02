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
import { FileText, PenLine, Sparkles, X, Target, ChevronRight } from "lucide-react";
import "@xyflow/react/dist/style.css";
import "./graph-modal.css";

import { useKnowledge } from "@/store/knowledge";
import { getAncestors } from "@/lib/pages";
import type { KnowledgePage } from "@/lib/types";

interface GraphCanvasProps {
  onClose: () => void;
}

/**
 * Custom node component to prevent the "white block" issue
 * and match the Knowledge OS aesthetic.
 */
function PageNode({ data, selected }: { data: any; selected: boolean }) {
  const Icon = data.kind === "whiteboard" ? PenLine : FileText;
  
  return (
    <div className={`group relative min-w-[160px] rounded-xl border px-3 py-2.5 transition-all duration-300 ${
      selected 
        ? "border-violet-400/60 bg-violet-600/20 shadow-[0_0_25px_rgba(139,92,246,0.25)]" 
        : "border-white/10 bg-[#0d0d14]/95 hover:border-white/20"
    }`}>
      <Handle type="target" position={Position.Top} className="invisible" />
      
      <div className="flex items-center gap-2.5">
        <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg border ${
          selected ? "border-violet-400/30 bg-violet-400/20" : "border-white/5 bg-white/5"
        }`}>
          {data.icon ? (
            <span className="text-[13px]">{data.icon}</span>
          ) : (
            <Icon className={`size-3.5 ${selected ? "text-violet-200" : "text-white/40"}`} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[13px] font-medium ${selected ? "text-white" : "text-white/80"}`}>
            {data.label}
          </div>
          {data.childCount > 0 && (
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/30">
              <ChevronRight className="size-2.5" />
              {data.childCount} sub-pages
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="invisible" />
      
      {selected && (
        <div className="absolute -inset-px rounded-xl bg-violet-400/5 animate-pulse pointer-events-none" />
      )}
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
    nodesep: 80, 
    ranksep: 100,
    marginx: 40,
    marginy: 40
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 70 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return {
    nodes: nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 100,
          y: nodeWithPosition.y - 35,
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
      type: "page",
      data: { 
        label: p.title || "Untitled", 
        kind: p.kind, 
        icon: p.icon,
        childCount: p.childrenIds.length
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
                  ? "rgba(167, 139, 250, 0.5)"
                  : "rgba(255, 255, 255, 0.08)",
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
    const timer = setTimeout(() => fitView({ padding: 0.3, duration: 600 }), 100);
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
    <div className="relative h-[80vh] w-full overflow-hidden rounded-2xl bg-[#08080c] calm-graph border border-white/5">
      <div className="absolute left-6 top-6 z-20 flex gap-2">
        <button
          onClick={() => setMode("overview")}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[12px] font-medium transition-all duration-200 ${
            mode === "overview"
              ? "border-violet-400/40 bg-violet-500/20 text-violet-100 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
              : "border-white/10 bg-[#12121a]/80 text-white/40 hover:text-white hover:bg-[#12121a]"
          }`}
        >
          <Sparkles className="size-3.5" />
          Overview
        </button>
        <button
          onClick={() => setMode("focus")}
          disabled={!state.activePageId}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[12px] font-medium transition-all duration-200 ${
            mode === "focus"
              ? "border-violet-400/40 bg-violet-500/20 text-violet-100 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
              : "border-white/10 bg-[#12121a]/80 text-white/40 hover:text-white hover:bg-[#12121a] disabled:opacity-20"
          }`}
        >
          <Target className="size-3.5" />
          Focus
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={32} 
          size={1} 
          color="rgba(255,255,255,0.03)" 
        />
        <Controls 
          showInteractive={false}
          className="bg-[#12121a]/95 border-white/10 text-white rounded-xl overflow-hidden" 
        />
        <MiniMap
          nodeColor={(n) => (n.id === state.activePageId ? "#8b5cf6" : "#2a2a35")}
          maskColor="rgba(8, 8, 12, 0.85)"
          className="bg-[#12121a]/95 border-white/10 rounded-xl"
        />
      </ReactFlow>

      {selectedPage && (
        <div className="absolute bottom-6 right-6 z-10 w-72 rounded-2xl border border-white/10 bg-[#0d0d12]/98 p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400/80">
              Selection
            </span>
            <button 
              onClick={() => setSelectedNodeId(null)} 
              className="flex size-6 items-center justify-center rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
          
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/5 border border-white/5">
              {selectedPage.kind === "whiteboard" ? (
                <PenLine className="size-5 text-violet-300" />
              ) : (
                <FileText className="size-5 text-white/40" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-white/90">
                {selectedPage.title || "Untitled"}
              </h3>
              <p className="mt-1 text-[11px] text-white/35 flex items-center gap-2">
                <span>{selectedPage.kind === "whiteboard" ? "Whiteboard" : "Document"}</span>
                <span className="size-1 rounded-full bg-white/10" />
                <span>{selectedPage.childrenIds.length} children</span>
              </p>
            </div>
          </div>
          
          <button
            onClick={() => {
              select(selectedNodeId);
              onClose();
            }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-[12px] font-semibold text-white transition-all hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.98]"
          >
            Open page
          </button>
        </div>
      )}
    </div>
  );
}