"use client";

import React, { useMemo } from "react";
import { Move, X } from "lucide-react";
import { useKnowledge } from "@/store/knowledge";
import GraphView, { type GraphNode, type GraphEdge } from "./graph-view";

export default function GraphCanvas({ onClose }: { onClose: () => void }) {
  const { state, select } = useKnowledge();

  const { nodes, edges } = useMemo(() => {
    const pages = Object.values(state.pages);
    const ns: GraphNode[] = pages.map((p) => ({
      id: p.id,
      label: p.title || "Untitled",
      group: p.kind || "document",
      icon: p.icon,
    }));

    const es: GraphEdge[] = [];
    pages.forEach((p) => {
      p.childrenIds.forEach((childId) => {
        if (state.pages[childId]) {
          es.push({ source: p.id, target: childId });
        }
      });
    });

    return { nodes: ns, edges: es };
  }, [state.pages]);

  const handleNavigate = (node: GraphNode) => {
    select(node.id);
    onClose();
  };

  return (
    <div className="relative h-[80vh] w-full overflow-hidden rounded-2xl border border-white/5 bg-[#08080A]">
      <GraphView
        nodes={nodes}
        edges={edges}
        selectedId={state.activePageId}
        onNodeOpen={handleNavigate}
      />

      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-xl">
          <Move className="size-3.5 text-violet-400" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Workspace Graph
          </span>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 flex items-center gap-5 rounded-2xl border border-white/10 bg-black/40 px-5 py-3 text-[11px] font-medium text-white/40 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-white/60">Drag</kbd>
          Pan & Move
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-white/60">Scroll</kbd>
          Zoom
        </div>
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-white/60">Click</kbd>
          Open Page
        </div>
      </div>

      <button
        onClick={onClose}
        className="absolute top-6 right-6 flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white/40 transition-all hover:bg-black/60 hover:text-white"
        aria-label="Close graph"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}