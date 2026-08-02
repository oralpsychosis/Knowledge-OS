"use client";

import React, { useMemo } from "react";
import { useKnowledge } from "@/store/knowledge";
import GraphView, { type GraphNode, type GraphEdge } from "./graph-view";

export default function GraphCanvas({ onClose }: { onClose: () => void }) {
  const { state, select } = useKnowledge();

  const { nodes, edges } = useMemo(() => {
    const pages = Object.values(state.pages);
    const ns: GraphNode[] = pages.map((p) => ({
      id: p.id,
      label: p.title || "Untitled",
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
        title="Workspace Graph"
      />
    </div>
  );
}