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

/** Where a ray from a rectangle's center toward (towardX, towardY) exits the
 *  rectangle's boundary. */
function anchorOnRect(
  rect: { x: number; y: number; w: number; h: number },
  towardX: number,
  towardY: number
) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const halfW = rect.w / 2;
  const halfH = rect.h / 2;
  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
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
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [tick, setTick] = useState(0);

  const [view, setView] = useState({ x: 0, y: 0, k: 0.8 });
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
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; viewX: number; viewY: number } | null>(
    null
  );

  /* ---------------- hierarchical layout (Dagre) --------------------- */

  useEffect(() => {
    const map = positionsRef.current;
    const existingIds = new Set(nodes.map((n) => n.id));
    for (const id of Array.from(map.keys())) {
      if (!existingIds.has(id)) map.delete(id);
    }

    // Check if we have nodes that need initial positioning
    const needsLayout = nodes.some((n) => !map.has(n.id) && n.x === undefined);

    if (needsLayout) {
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

      nodes.forEach((n) => {
        // Use persisted pos if it exists, otherwise use dagre's result
        if (n.x !== undefined && n.y !== undefined) {
          map.set(n.id, { x: n.x, y: n.y });
        } else {
          const dagreNode = g.node(n.id);
          map.set(n.id, { x: dagreNode.x - CARD_WIDTH / 2, y: dagreNode.y - CARD_MIN_HEIGHT / 2 });
        }
      });
      setTick((t) => t + 1);
    } else {
      // Just ensure nodes that are already in the map or have props are set correctly
      nodes.forEach((n) => {
        if (!map.has(n.id) && n.x !== undefined && n.y !== undefined) {
          map.set(n.id, { x: n.x, y: n.y });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomBy(factor, { x: e.clientX, y: e.clientY });
    },
    [zoomBy]
  );

  const fitToNodes = useCallback(() => {
    const el = containerRef.current;
    const map = positionsRef.current;
    if (!el || map.size === 0) return;
    const rect = el.getBoundingClientRect();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    map.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + CARD_WIDTH);
      maxY = Math.max(maxY, p.y + CARD_MIN_HEIGHT);
    });
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(rect.width / (w + 120), rect.height / (h + 120))));
    setView({ k, x: rect.width / 2 - (minX + w / 2) * k, y: rect.height / 2 - (minY + h / 2) * k });
  }, []);

  /* ---------------- background pan ------------------------------------ */

  const handleBackgroundPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [view.x, view.y]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
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
        positionsRef.current.set(drag.id, { x: nextX, y: nextY });
        setTick((t) => t + 1);
      }
    },
    [view.k]
  );

  /* ---------------- node interactions -------------------------------- */

  const selectNode = useCallback(
    (id: string, open: boolean) => {
      if (selectedId === undefined || selectedId === null) setInternalSelectedId(id);
      const node = nodes.find((n) => n.id === id) ?? null;
      onNodeSelect?.(node);
      if (open && node) onNodeOpen?.(node);
    },
    [nodes, onNodeOpen, onNodeSelect, selectedId]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (panRef.current?.pointerId === e.pointerId) panRef.current = null;
      const drag = dragRef.current;
      if (drag && drag.pointerId === e.pointerId) {
        if (drag.moved) {
          const pos = positionsRef.current.get(drag.id);
          if (pos) onNodeMove?.(drag.id, pos);
        } else {
          selectNode(drag.id, true);
        }
        dragRef.current = null;
        setDraggingId(null);
      }
    },
    [onNodeMove, selectNode]
  );

  const handleCardPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    const pos = positionsRef.current.get(id);
    if (!pos) return;
    dragRef.current = {
      id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startNodeX: pos.x,
      startNodeY: pos.y,
      moved: false,
    };
    setDraggingId(id);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, []);

  /* ---------------- derived render data -------------------------------- */

  const positions = positionsRef.current;
  void tick;

  const activeId = hoveredId ?? selected;
  const neighborIds = useMemo(() => {
    if (!activeId) return null;
    const s = new Set<string>();
    for (const e of edges) {
      if (e.source === activeId) s.add(e.target);
      if (e.target === activeId) s.add(e.source);
    }
    return s;
  }, [edges, activeId]);

  return (
    <div className={`relative flex h-full w-full flex-col overflow-hidden bg-[#0B0B0D] ${className}`}>
      {title !== null && (
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
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2"
            style={{ background: "radial-gradient(ellipse at top, rgba(139,124,246,0.07), transparent 65%)" }}
          />
        </div>

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
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: "0 0" }}
          >
            {/* schematic connectors */}
            <svg
              className="absolute overflow-visible"
              style={{ left: 0, top: 0, width: 1, height: 1, pointerEvents: "none" }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="rgba(139,124,246,0.3)" />
                </marker>
              </defs>
              {edges.map((e, i) => {
                const a = positions.get(e.source);
                const b = positions.get(e.target);
                if (!a || !b) return null;

                const start = { x: a.x + CARD_WIDTH / 2, y: a.y + CARD_MIN_HEIGHT };
                const end = { x: b.x + CARD_WIDTH / 2, y: b.y };
                const midY = (start.y + end.y) / 2;
                
                const isFocused = !!activeId && (e.source === activeId || e.target === activeId);
                
                // Arced cubic bezier for a sleek "mother -> child" flow
                const path = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;

                return (
                  <path
                    key={`${e.source}-${e.target}-${i}`}
                    d={path}
                    fill="none"
                    stroke={isFocused ? "#a19be0" : "rgba(255,255,255,0.08)"}
                    strokeWidth={isFocused ? 2 : 1.5}
                    markerEnd={isFocused ? "url(#arrowhead)" : undefined}
                    style={{ transition: "stroke 200ms ease, stroke-width 200ms ease" }}
                  />
                );
              })}
            </svg>

            {/* cards */}
            {nodes.map((n) => {
              const pos = positions.get(n.id);
              if (!pos) return null;
              const isSelected = selected === n.id;
              const isHovered = hoveredId === n.id;
              const isDragging = draggingId === n.id;
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
                    opacity: isDimmed ? 0.3 : 1,
                    background: isHovered || isSelected || isDragging ? "#1B1B20" : "#121216",
                    borderColor: isSelected || isDragging ? "rgba(139,124,246,0.6)" : "rgba(255,255,255,0.1)",
                    cursor: isDragging ? "grabbing" : "grab",
                    zIndex: isDragging ? 30 : isSelected ? 2 : 1,
                    transform: isDragging ? "scale(1.02)" : "scale(1)",
                    boxShadow: isDragging
                      ? "0 20px 40px -10px rgba(0,0,0,0.6)"
                      : "0 4px 12px rgba(0,0,0,0.2)",
                    transition: isDragging
                      ? "none"
                      : "opacity 200ms ease, border-color 200ms ease, background-color 200ms ease, transform 200ms ease",
                  }}
                  onPointerDown={(e) => handleCardPointerDown(e, n.id)}
                  onPointerEnter={() => setHoveredId(n.id)}
                  onPointerLeave={() => setHoveredId((h) => (h === n.id ? null : h))}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-[2px] opacity-0 transition-opacity duration-200"
                    style={{
                      background: "linear-gradient(90deg, #8b7cf6, #6ea8fe)",
                      opacity: isSelected || isDragging || isHovered ? 1 : 0,
                    }}
                  />
                  <div className="flex h-full items-center gap-3 px-3.5 py-3">
                    <span
                      className="flex h-6 w-6 flex-none items-center justify-center rounded-[6px] font-mono text-[11px] font-bold overflow-hidden"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: isHovered || isSelected || isDragging ? "#c9c1fb" : "#71717a",
                      }}
                    >
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

        {showHints && (
          <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-4 font-mono text-[10px] text-zinc-600">
            <span>DRAG MOVE</span>
            <span className="text-zinc-800">·</span>
            <span>SCROLL ZOOM</span>
            <span className="text-zinc-800">·</span>
            <span>CLICK OPEN</span>
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex flex-col gap-1 rounded-xl border border-white/[0.08] bg-[#121216]/80 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={(e) => zoomBy(1.2, { x: e.clientX, y: e.clientY })}
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => zoomBy(0.8, { x: e.clientX, y: e.clientY })}
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={fitToNodes}
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}