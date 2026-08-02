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
  /** Fired when a card is dropped in a new spot. */
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
const GRID_GAP_X = 64;
const GRID_GAP_Y = 48;
const GRID_PADDING = 60;
const MIN_SCALE = 0.2;
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
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [tick, setTick] = useState(0);

  const [view, setView] = useState({ x: 0, y: 0, k: 0.9 });
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
        x: GRID_PADDING + col * (CARD_WIDTH + GRID_GAP_X),
        y: GRID_PADDING + row * (CARD_MIN_HEIGHT + GRID_GAP_Y),
      });
    });
    if (seededAny) setTick((t) => t + 1);
  }, [nodes]);

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
    <div className={`relative flex h-full w-full flex-col overflow-hidden bg-[#070709] ${className}`}>
      {title !== null && (
        <div className="flex h-12 flex-none items-center justify-between border-b border-white/[0.05] bg-[#0a0a0c]/50 px-5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60">
              {title}
            </span>
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay">
          <svg className="h-full w-full">
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves={3} stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
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
            {/* simple straight edges */}
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
                const isFocused = !!activeId && (e.source === activeId || e.target === activeId);
                return (
                  <line
                    key={`${e.source}-${e.target}-${i}`}
                    x1={ax} y1={ay} x2={bx} y2={by}
                    stroke={isFocused ? "rgba(167,139,250,0.8)" : "rgba(255,255,255,0.08)"}
                    strokeWidth={isFocused ? 1.5 : 1}
                    style={{ transition: "stroke 150ms ease" }}
                  />
                );
              })}
            </svg>

            {/* obsidian pages */}
            {nodes.map((n) => {
              const pos = positions.get(n.id);
              if (!pos) return null;
              const isSelected = selected === n.id;
              const isHovered = hoveredId === n.id;
              const isDimmed = !!neighborIds && !neighborIds.has(n.id) && !isHovered && !isSelected;

              return (
                <div
                  key={n.id}
                  className="absolute select-none overflow-hidden rounded-xl border transition-all duration-150"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: CARD_WIDTH,
                    minHeight: CARD_MIN_HEIGHT,
                    opacity: isDimmed ? 0.3 : 1,
                    background: isSelected 
                      ? "rgba(45, 38, 70, 0.92)" 
                      : isHovered 
                        ? "rgba(35, 35, 45, 0.95)" 
                        : "rgba(24, 24, 28, 0.9)",
                    borderColor: isSelected 
                      ? "rgba(167, 139, 250, 0.5)" 
                      : "rgba(255, 255, 255, 0.08)",
                    boxShadow: isSelected 
                      ? "0 0 24px rgba(139, 92, 246, 0.15), inset 0 0 12px rgba(167, 139, 250, 0.05)" 
                      : "0 4px 12px rgba(0,0,0,0.3)",
                    cursor: "grab",
                  }}
                  onPointerDown={(e) => handleCardPointerDown(e, n.id)}
                  onPointerEnter={() => setHoveredId(n.id)}
                  onPointerLeave={() => setHoveredId((h) => (h === n.id ? null : h))}
                >
                  <div className="flex h-full items-start gap-3 px-4 py-3.5">
                    <span
                      className="flex h-5 w-5 flex-none items-center justify-center rounded-[5px] font-mono text-[10px] font-bold"
                      style={{
                        background: isSelected ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                        color: isSelected ? "#c4b5fd" : isHovered ? "#94a3b8" : "#52525b",
                      }}
                    >
                      {initialOf(n.label)}
                    </span>
                    <span
                      className="pt-px text-[13px] font-medium leading-snug text-zinc-200"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        opacity: isSelected || isHovered ? 1 : 0.85
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

        {showHints && (
          <div className="pointer-events-none absolute bottom-4 left-5 flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            <span><span className="text-zinc-400">drag</span> pan</span>
            <span><span className="text-zinc-400">scroll</span> zoom</span>
            <span><span className="text-zinc-400">click</span> open</span>
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-black/40 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={(e) => zoomBy(1.3, { x: e.clientX, y: e.clientY })}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Zoom in"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={(e) => zoomBy(0.7, { x: e.clientX, y: e.clientY })}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Zoom out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            onClick={fitToNodes}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Fit to view"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}