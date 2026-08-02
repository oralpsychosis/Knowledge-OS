"use client";

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
import { Maximize2, ZoomIn, ZoomOut, FileText } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface GraphNode {
  id: string;
  label: string;
  /** Optional starting position (world space). Auto-arranged in a grid if omitted. */
  x?: number;
  y?: number;
  /** Optional custom icon. Defaults to a plain page icon. */
  icon?: ReactNode;
}

export interface GraphEdge {
  /** Edges should only represent real page → sub-page links. */
  source: string;
  target: string;
}

export interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Fired when a card is clicked (a real click, not the end of a drag) — open that page. */
  onNodeOpen?: (node: GraphNode) => void;
  onNodeSelect?: (node: GraphNode | null) => void;
  /** Fired when a card is dropped in a new spot, so the position can be persisted. */
  onNodeMove?: (id: string, pos: { x: number; y: number }) => void;
  selectedId?: string | null;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Layout constants                                                   */
/* ------------------------------------------------------------------ */

const CARD_WIDTH = 200;
const CARD_MIN_HEIGHT = 64;
const GRID_GAP_X = 64;
const GRID_GAP_Y = 48;
const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;

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
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // World-space position of every card. Seeded once per node id; never
  // recomputed after that, so a card never jumps once it's been placed.
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [tick, setTick] = useState(0); // bump to re-render after ref mutations

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
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

  /* ---------------- seed positions for new nodes --------------------- */

  useEffect(() => {
    const map = positionsRef.current;
    const existingIds = new Set(nodes.map((n) => n.id));
    for (const id of Array.from(map.keys())) {
      if (!existingIds.has(id)) map.delete(id);
    }

    const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    let seededAny = false;
    nodes.forEach((n, i) => {
      if (map.has(n.id)) return;
      seededAny = true;
      if (n.x !== undefined && n.y !== undefined) {
        map.set(n.id, { x: n.x, y: n.y });
        return;
      }
      const col = i % cols;
      const row = Math.floor(i / cols);
      map.set(n.id, {
        x: col * (CARD_WIDTH + GRID_GAP_X),
        y: row * (CARD_MIN_HEIGHT + GRID_GAP_Y),
      });
    });
    if (seededAny) setTick((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

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

  const resetView = useCallback(() => {
    setView({ x: 0, y: 0, k: 1 });
  }, []);

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
    const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(rect.width / (w + 160), rect.height / (h + 160))));
    setView({
      k,
      x: rect.width / 2 - (minX + w / 2) * k,
      y: rect.height / 2 - (minY + h / 2) * k,
    });
  }, []);

  /* ---------------- background pan ------------------------------------ */

  const handleBackgroundPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return; // only start pan from empty canvas, not a card
      panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    },
    [view.x, view.y]
  );

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (pan && pan.pointerId === e.pointerId) {
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      setView((v) => ({ ...v, x: pan.viewX + dx, y: pan.viewY + dy }));
      return;
    }

    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      // Direct 1:1 tracking: screen-space pointer delta converted to world
      // space by the current zoom level. No simulation, no lag, no snap-back.
      const dxScreen = e.clientX - drag.startClientX;
      const dyScreen = e.clientY - drag.startClientY;
      if (Math.abs(dxScreen) > 2 || Math.abs(dyScreen) > 2) drag.moved = true;
      const nextX = drag.startNodeX + dxScreen / view.k;
      const nextY = drag.startNodeY + dyScreen / view.k;
      positionsRef.current.set(drag.id, { x: nextX, y: nextY });
      setTick((t) => t + 1);
    }
  }, [view.k]);

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
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, []);

  /* ---------------- derived render data -------------------------------- */

  const positions = positionsRef.current;
  void tick; // read to keep this render subscribed to position/selection changes

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
    <div className={`relative h-full w-full overflow-hidden bg-[#08080A] ${className}`}>
      {/* ambient glow — fixed to the viewport, doesn't pan/zoom with the canvas */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/3 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.16] blur-[140px]"
          style={{ background: "radial-gradient(circle, #7c6cf6 0%, transparent 70%)" }}
        />
        <div
          className="absolute right-1/4 bottom-1/4 h-[420px] w-[420px] translate-x-1/2 translate-y-1/2 rounded-full opacity-[0.10] blur-[120px]"
          style={{ background: "radial-gradient(circle, #6ea8fe 0%, transparent 70%)" }}
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
          {/* edges — drawn first, so cards sit visually on top of the lines */}
          <svg
            className="absolute overflow-visible"
            style={{ left: 0, top: 0, width: 1, height: 1, pointerEvents: "none" }}
          >
            {edges.map((e, i) => {
              const a = positions.get(e.source);
              const b = positions.get(e.target);
              if (!a || !b) return null;
              const ax = a.x + CARD_WIDTH / 2;
              const ay = a.y + CARD_MIN_HEIGHT / 2;
              const bx = b.x + CARD_WIDTH / 2;
              const by = b.y + CARD_MIN_HEIGHT / 2;
              const mx = (ax + bx) / 2;
              const my = (ay + by) / 2;
              const isFocused = !!activeId && (e.source === activeId || e.target === activeId);
              return (
                <path
                  key={`${e.source}-${e.target}-${i}`}
                  d={`M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`}
                  fill="none"
                  stroke={isFocused ? "#8b7cf6" : "#2b2b34"}
                  strokeWidth={isFocused ? 1.5 : 1}
                  strokeOpacity={isFocused ? 0.8 : 0.45}
                  style={{ transition: "stroke 150ms ease, stroke-opacity 150ms ease" }}
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
            const isDimmed = !!neighborIds && !neighborIds.has(n.id) && !isHovered && !isSelected;

            return (
              <div
                key={n.id}
                className="absolute select-none rounded-2xl border backdrop-blur-xl transition-[opacity,box-shadow,border-color] duration-150"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: CARD_WIDTH,
                  minHeight: CARD_MIN_HEIGHT,
                  opacity: isDimmed ? 0.4 : 1,
                  background: "rgba(255,255,255,0.045)",
                  borderColor: isSelected ? "rgba(139,124,246,0.65)" : "rgba(255,255,255,0.09)",
                  boxShadow: isSelected
                    ? "0 0 0 1px rgba(139,124,246,0.25), 0 8px 28px -6px rgba(124,108,246,0.45)"
                    : isHovered
                      ? "0 8px 24px -8px rgba(0,0,0,0.5)"
                      : "0 4px 14px -6px rgba(0,0,0,0.4)",
                  cursor: "grab",
                }}
                onPointerDown={(e) => handleCardPointerDown(e, n.id)}
                onPointerEnter={() => setHoveredId(n.id)}
                onPointerLeave={() => setHoveredId((h) => (h === n.id ? null : h))}
              >
                <div className="flex h-full items-start gap-2.5 px-4 py-3.5">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md text-zinc-400"
                    style={{ opacity: isHovered || isSelected ? 1 : 0.7 }}
                  >
                    {n.icon ?? <FileText size={15} />}
                  </span>
                  <span
                    className="text-[13.5px] font-medium leading-snug text-zinc-100"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-md">
        <button
          type="button"
          onClick={(e) => zoomBy(1.25, { x: e.clientX, y: e.clientY })}
          className="rounded-lg p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={(e) => zoomBy(0.8, { x: e.clientX, y: e.clientY })}
          className="rounded-lg p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          onClick={fitToNodes}
          className="rounded-lg p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Fit to view"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
}