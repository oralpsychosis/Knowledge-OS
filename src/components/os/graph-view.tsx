import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import dagre from "@dagrejs/dagre";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface GraphNode {
  id: string;
  label: string;
  avatarImage?: string;
  icon?: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeOpen?: (node: GraphNode) => void;
  onNodeSelect?: (node: GraphNode | null) => void;
  onNodeMove?: (id: string, pos: { x: number; y: number }) => void;
  selectedId?: string | null;
  className?: string;
  title?: ReactNode | null;
  showHints?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Layout constants                                                   */
/* ------------------------------------------------------------------ */

const CARD_WIDTH = 200;
const CARD_MIN_HEIGHT = 60;
const NODE_SEP = 80;
const RANK_SEP = 120;
const MIN_SCALE = 0.15;
const MAX_SCALE = 2.5;

function initialOf(label: string) {
  const trimmed = label.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GraphView({
  nodes,
  edges,
  onNodeOpen,
  onNodeSelect,
  onNodeMove,
  selectedId = null,
  className = "",
  title = "Workspace Map",
  showHints = true,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [view, setView] = useState({ x: 0, y: 0, k: 0.75 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(selectedId);
  const selected = selectedId !== undefined && selectedId !== null ? selectedId : internalSelectedId;

  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startNodeX: number;
    startNodeY: number;
    moved: boolean;
  } | null>(null);
  
  const panRef = useRef<{ 
    pointerId: number; 
    startX: number; 
    startY: number; 
    viewX: number; 
    viewY: number 
  } | null>(null);

  /* ---------------- hierarchical layout (Dagre) --------------------- */

  useEffect(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB", nodesep: NODE_SEP, ranksep: RANK_SEP });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((n) => {
      g.setNode(n.id, { width: CARD_WIDTH, height: CARD_MIN_HEIGHT });
    });

    edges.forEach((e) => {
      g.setEdge(e.source, e.target);
    });

    dagre.layout(g);

    const nextPositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      if (n.x !== undefined && n.y !== undefined) {
        nextPositions[n.id] = { x: n.x, y: n.y };
      } else {
        const dagreNode = g.node(n.id);
        nextPositions[n.id] = { 
          x: dagreNode.x - CARD_WIDTH / 2, 
          y: dagreNode.y - CARD_MIN_HEIGHT / 2 
        };
      }
    });

    setPositions(nextPositions);
  }, [nodes, edges]);

  /* ---------------- zoom / pan --------------------------------------- */

  const zoomBy = useCallback((factor: number, pivot?: { x: number; y: number }) => {
    const el = containerRef.current;
    setView((v) => {
      const nextK = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.k * factor));
      if (!pivot || !el) return { ...v, k: nextK };
      const rect = el.getBoundingClientRect();
      const px = pivot.x - rect.left;
      const py = pivot.y - rect.top;
      const worldX = (px - v.x) / v.k;
      const worldY = (py - v.y) / v.k;
      return { k: nextK, x: px - worldX * nextK, y: py - worldY * nextK };
    });
  }, []);

  const handleWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    zoomBy(factor, { x: e.clientX, y: e.clientY });
  }, [zoomBy]);

  const fitToNodes = useCallback(() => {
    const el = containerRef.current;
    const posEntries = Object.entries(positions);
    if (!el || posEntries.length === 0) return;
    
    const rect = el.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    posEntries.forEach(([_, p]) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + CARD_WIDTH);
      maxY = Math.max(maxY, p.y + CARD_MIN_HEIGHT);
    });

    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const padding = 100;
    const k = Math.min(1.2, Math.max(MIN_SCALE, Math.min(rect.width / (w + padding), rect.height / (h + padding))));
    
    setView({ 
      k, 
      x: rect.width / 2 - (minX + w / 2) * k, 
      y: rect.height / 2 - (minY + h / 2) * k 
    });
  }, [positions]);

  // Auto-fit on first load when positions are ready
  const initialFitPerformed = useRef(false);
  useEffect(() => {
    if (!initialFitPerformed.current && Object.keys(positions).length > 0) {
      fitToNodes();
      initialFitPerformed.current = true;
    }
  }, [positions, fitToNodes]);

  /* ---------------- interactions ------------------------------------ */

  const handleBackgroundPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    panRef.current = { 
      pointerId: e.pointerId, 
      startX: e.clientX, 
      startY: e.clientY, 
      viewX: view.x, 
      viewY: view.y 
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (pan && pan.pointerId === e.pointerId) {
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      setView((v) => ({ ...v, x: pan.viewX + dx, y: pan.viewY + dy }));
      return;
    }

    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      const dxScreen = e.clientX - drag.startClientX;
      const dyScreen = e.clientY - drag.startClientY;
      if (Math.abs(dxScreen) > 2 || Math.abs(dyScreen) > 2) drag.moved = true;
      
      const nextX = drag.startNodeX + dxScreen / view.k;
      const nextY = drag.startNodeY + dyScreen / view.k;
      
      setPositions(prev => ({
        ...prev,
        [drag.id]: { x: nextX, y: nextY }
      }));
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === e.pointerId) panRef.current = null;
    
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      if (drag.moved) {
        const pos = positions[drag.id];
        if (pos) onNodeMove?.(drag.id, pos);
      } else {
        const node = nodes.find(n => n.id === drag.id);
        if (node) {
          if (selectedId === undefined) setInternalSelectedId(node.id);
          onNodeSelect?.(node);
          onNodeOpen?.(node);
        }
      }
      dragRef.current = null;
      setDraggingId(null);
    }
  };

  const activeId = hoveredId ?? selected;
  const neighborIds = useMemo(() => {
    if (!activeId) return null;
    const s = new Set<string>();
    edges.forEach((e) => {
      if (e.source === activeId) s.add(e.target);
      if (e.target === activeId) s.add(e.source);
    });
    return s;
  }, [edges, activeId]);

  return (
    <div className={`relative flex h-full w-full flex-col overflow-hidden bg-[#0B0B0D] ${className}`}>
      {title && (
        <div className="flex h-11 flex-none items-center justify-between border-b border-white/[0.06] px-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8b7cf6]/70" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              {title}
            </span>
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div
            className="absolute left-0 top-0"
            style={{ 
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, 
              transformOrigin: "0 0" 
            }}
          >
            {/* straight lines are cleaner and easier to read */}
            <svg className="absolute overflow-visible" style={{ pointerEvents: "none" }}>
              {edges.map((e, i) => {
                const a = positions[e.source];
                const b = positions[e.target];
                if (!a || !b) return null;

                const isFocused = activeId === e.source || activeId === e.target;
                
                return (
                  <line
                    key={`${e.source}-${e.target}-${i}`}
                    x1={a.x + CARD_WIDTH / 2}
                    y1={a.y + CARD_MIN_HEIGHT}
                    x2={b.x + CARD_WIDTH / 2}
                    y2={b.y}
                    stroke={isFocused ? "#8b7cf6" : "rgba(255,255,255,0.08)"}
                    strokeWidth={isFocused ? 2 : 1}
                  />
                );
              })}
            </svg>

            {nodes.map((n) => {
              const pos = positions[n.id];
              if (!pos) return null;
              
              const isSelected = selected === n.id;
              const isHovered = hoveredId === n.id;
              const isDragging = draggingId === n.id;
              // Much higher opacity for non-selected nodes
              const isDimmed = !!neighborIds && !neighborIds.has(n.id) && !isHovered && !isSelected && !isDragging;

              return (
                <div
                  key={n.id}
                  className="absolute select-none overflow-hidden rounded-xl border"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: CARD_WIDTH,
                    minHeight: CARD_MIN_HEIGHT,
                    opacity: isDimmed ? 0.6 : 1,
                    background: isHovered || isSelected || isDragging ? "#1B1B20" : "#121216",
                    borderColor: isSelected || isDragging ? "rgba(139,124,246,0.6)" : "rgba(255,255,255,0.1)",
                    cursor: isDragging ? "grabbing" : "grab",
                    zIndex: isDragging ? 30 : isSelected ? 2 : 1,
                    transition: isDragging ? "none" : "all 200ms ease",
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dragRef.current = {
                      id: n.id,
                      pointerId: e.pointerId,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startNodeX: pos.x,
                      startNodeY: pos.y,
                      moved: false,
                    };
                    setDraggingId(n.id);
                    (e.currentTarget as Element).setPointerCapture(e.pointerId);
                  }}
                  onPointerEnter={() => setHoveredId(n.id)}
                  onPointerLeave={() => setHoveredId(h => h === n.id ? null : h)}
                >
                  <div className="flex h-full items-center gap-3 px-3.5 py-3">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-[6px] bg-white/[0.05] overflow-hidden text-[11px] font-bold">
                      {n.avatarImage ? (
                        <img src={n.avatarImage} alt="" className="h-full w-full object-cover" />
                      ) : n.icon ? (
                        <span className="text-[14px]">{n.icon}</span>
                      ) : (
                        <span>{initialOf(n.label)}</span>
                      )}
                    </span>
                    <span className="min-w-0 truncate text-[13px] font-medium text-zinc-200">
                      {n.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-4 right-4 flex flex-col gap-1 rounded-xl border border-white/[0.08] bg-[#121216]/80 p-1 backdrop-blur-md">
          <button type="button" onClick={(e) => zoomBy(1.2, { x: e.clientX, y: e.clientY })} className="p-2 text-zinc-500 hover:text-white transition"><ZoomIn size={14} /></button>
          <button type="button" onClick={(e) => zoomBy(0.8, { x: e.clientX, y: e.clientY })} className="p-2 text-zinc-500 hover:text-white transition"><ZoomOut size={14} /></button>
          <button type="button" onClick={fitToNodes} className="p-2 text-zinc-500 hover:text-white transition"><Maximize2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}