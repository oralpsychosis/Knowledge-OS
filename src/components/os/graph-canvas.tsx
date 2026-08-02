"use client";

import React, { useMemo } from "react";
import { useKnowledge } from "@/store/knowledge";
import GraphView, { type GraphNode, type GraphEdge } from "./graph-view";

export default function GraphCanvas({ onClose }: { onClose: () => void }) {
  const { state, select, patchPage } = useKnowledge();

  const { nodes, edges } = useMemo(() => {
    const pages = Object.values(state.pages);
    const ns: GraphNode[] = pages.map((p) => ({
      id: p.id,
      label: p.title || "Untitled",
      x: p.graphX,
      y: p.graphY,
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

  const handleNodeMove = (id: string, pos: { x: number; y: number }) => {
    patchPage(id, { graphX: pos.x, graphY: pos.y });
  };

  return (
    <div className="relative h-[80vh] w-full overflow-hidden rounded-2xl border border-white/5 bg-[#08080A]">
      <GraphView
        nodes={nodes}
        edges={edges}
        selectedId={state.activePageId}
        onNodeOpen={handleNavigate}
        onNodeMove={handleNodeMove}
        title="Workspace Graph"
      />
    </div>
  );
}