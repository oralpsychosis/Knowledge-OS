"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, PenLine, MousePointer2, Move, ExternalLink, X } from "lucide-react";
import { useKnowledge } from "@/store/knowledge";
import { getAncestors } from "@/lib/pages";
import dagre from "@dagrejs/dagre";

interface NodePos {
  id: string;
  x: number;
  y: number;
  label: string;
  kind?: string;
  icon?: string;
}

interface EdgePos {
  from: string;
  to: string;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 52;

export default function GraphCanvas({ onClose }: { onClose: () => void }) {
  const { state, select } = useKnowledge();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Graph State
  const [nodes, setNodes] = useState<NodePos[]>([]);
  const [edges, setEdges] = useState<EdgePos[]>([]);
  const [scale, setScale] = useState(0.85);
  const [offset, setOffset] = useState({ x: 100, y: 100 });
  const [selectedId, setSelectedId] = useState<string | null>(state.activePageId);

  // Interaction Refs
  const draggingNode = useRef<string | null>(null);
  const draggingCanvas = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Initial Layout using Dagre (since we already have it)
  useEffect(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB", nodesep: 70, ranksep: 100 });
    g.setDefaultEdgeLabel(() => ({}));

    const pages = Object.values(state.pages);
    const newEdges: EdgePos[] = [];

    pages.forEach((p) => {
      g.setNode(p.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
      p.childrenIds.forEach((childId) => {
        if (state.pages[childId]) {
          g.setEdge(p.id, childId);
          newEdges.push({ from: p.id, to: childId });
        }
      });
    });

    dagre.layout(g);

    const newNodes = pages.map((p) => {
      const pos = g.node(p.id);
      return {
        id: p.id,
        label: p.title || "Untitled",
        kind: p.kind,
        icon: p.icon,
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);

    // Center the graph initially
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setOffset({ x: rect.width / 2 - 100, y: 100 });
    }
  }, [state.pages]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offset.x) / scale,
      y: (clientY - rect.top - offset.y) / scale,
    };
  }, [offset, scale]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.05 : 0.95;
    const newScale = Math.min(2, Math.max(0.2, scale * delta));
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - offset.x) / scale;
      const worldY = (mouseY - offset.y) / scale;

      setOffset({
        x: mouseX - worldX * newScale,
        y: mouseY - worldY * newScale,
      });
      setScale(newScale);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingNode.current) {
      const world = screenToWorld(e.clientX, e.clientY);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNode.current
            ? { ...n, x: world.x - NODE_WIDTH / 2, y: world.y - NODE_HEIGHT / 2 }
            : n
        )
      );
      return;
    }

    if (draggingCanvas.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    draggingCanvas.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const up = () => {
      draggingNode.current = null;
      draggingCanvas.current = false;
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const nodeLookup = useMemo(() => {
    const map = new Map<string, NodePos>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const handleNavigate = (id: string) => {
    select(id);
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[80vh] w-full overflow-hidden bg-[#08080c] select-none rounded-2xl border border-white/5"
      onWheel={onWheel}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/5 blur-[120px] rounded-full" />
      </div>

      <div
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
        className="absolute inset-0 transition-transform duration-75 ease-out"
      >
        {/* Connection Lines */}
        <svg className="absolute inset-0 overflow-visible pointer-events-none" width="1" height="1">
          <defs>
            <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {edges.map((edge) => {
            const a = nodeLookup.get(edge.from);
            const b = nodeLookup.get(edge.to);
            if (!a || !b) return null;

            const x1 = a.x + NODE_WIDTH / 2;
            const y1 = a.y + NODE_HEIGHT;
            const x2 = b.x + NODE_WIDTH / 2;
            const y2 = b.y;

            const cp1y = y1 + (y2 - y1) * 0.5;
            const cp2y = y2 - (y2 - y1) * 0.5;

            const d = `M ${x1} ${y1} C ${x1} ${cp1y}, ${x2} ${cp2y}, ${x2} ${y2}`;

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={d}
                  stroke="url(#edge-gradient)"
                  strokeWidth="2"
                  fill="none"
                  filter="url(#line-glow)"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const isActive = selectedId === node.id;
          const Icon = node.kind === "whiteboard" ? PenLine : FileText;

          return (
            <motion.div
              key={node.id}
              initial={false}
              animate={{ left: node.x, top: node.y }}
              onMouseDown={(e) => {
                e.stopPropagation();
                draggingNode.current = node.id;
                setSelectedId(node.id);
              }}
              onDoubleClick={() => handleNavigate(node.id)}
              className={`absolute flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 cursor-grab active:cursor-grabbing backdrop-blur-xl group
                ${isActive 
                  ? "border-violet-400/50 bg-violet-600/15 shadow-[0_0_25px_rgba(139,92,246,0.25)] ring-1 ring-violet-400/20" 
                  : "border-white/10 bg-[#111118]/90 hover:border-violet-400/30 hover:bg-[#161622]"
                }
              `}
              style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
            >
              <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                isActive ? "border-violet-400/40 bg-violet-500/20 text-violet-200" : "border-white/10 bg-white/5 text-white/40"
              }`}>
                {node.icon ? <span className="text-[13px]">{node.icon}</span> : <Icon className="size-3.5" />}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-white/90">
                  {node.label}
                </div>
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate(node.id);
                  }}
                  className="flex size-6 items-center justify-center rounded-md hover:bg-white/10 text-white/40 hover:text-white"
                >
                  <ExternalLink className="size-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Interface Overlay */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
          <Move className="size-3.5 text-violet-400" />
          <span className="text-[11px] font-medium text-white/60 tracking-wider uppercase">Workspace Graph</span>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 flex items-center gap-4 px-4 py-2 rounded-xl border border-white/10 bg-[#111118]/80 text-[11px] text-white/40 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/60">Drag</kbd> Pan
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/60">Scroll</kbd> Zoom
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/60">Double-Click</kbd> Open Page
        </div>
      </div>

      <button
        onClick={onClose}
        className="absolute top-6 right-6 flex size-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-white/40 hover:text-white hover:bg-black/60 backdrop-blur-md transition-all"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}