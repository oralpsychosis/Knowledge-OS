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
  /** Edges should only represent real page → sub-page links. */
  source: string;
  target: string;
}

export interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeOpen?: (node: GraphNode) => void;
  onNodeSelect?: (node: GraphNode | null) => void;
  /** Fired when a card is dropped in a new spot, so the position can be persisted. */
  onNodeMove?: (id: string, pos: { x: number; y: number }) => void;
  selectedId?: string | null;
  className?: string;
  /** Title shown in the header strip. Set to null to hide the header entirely. */
  title?: ReactNode | null;
  /** Show the small control-hints line bottom-left. Default true. */
  showHints?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Layout constants                                                   */
/* ------------------------------------------------------------------ */

const CARD_WIDTH = 200;
const CARD_MIN_HEIGHT = 60;
const GRID_GAP_X = 56;
const GRID_GAP_Y = 44;
const GRID_PADDING = 48;
const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;

function initialOf(label: string) {
  const trimmed = label.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}

/** Where a ray from a rectangle's center toward (towardX, towardY) exits the
 *  rectangle's boundary — so a line lands on the bottom edge when the other
 *  card is below it, the side edge when it's beside it, etc., instead of
 *  cutting through the middle of the box. */
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
  title = "Workspace Graph",
  showHints = true,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [tick, setTick] = useState(0);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
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
        x: GRID_PADDING + col * (CARD_WIDTH + GRID_GAP_X),
        y: GRID_PADDING + row * (CARD_MIN_HEIGHT + GRID_GAP_Y),
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
      {/* header — real layout space, never overlays the canvas */}
      {title !== null && (
        <div className="flex h-11 flex-none items-center justify-between border-b border-white/[0.06] px-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8b7cf6]/70" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              {title}
            </span>
          </div>
          {/* Internal close button removed to fix double X issue */}
        </div>
      )}

      {/* canvas */}
      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2"
            style={{ background: "radial-gradient(ellipse at top, rgba(139,124,246,0.07), transparent 65%)" }}
          />
          <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay">
            <filter id="grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#grain)" />
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
            {/* edges */}
            <svg
              className="absolute overflow-visible"
              style={{ left: 0, top: 0, width: 1, height: 1, pointerEvents: "none" }}
            >
              {edges.map((e, i) => {
                const a = positions.get(e.source);
                const b = positions.get(e.target);
                if (!a || !b) return null;
                const rectA = { x: a.x, y: a.y, w: CARD_WIDTH, h: CARD_MIN_HEIGHT };
                const rectB = { x: b.x, y: b.y, w: CARD_WIDTH, h: CARD_MIN_HEIGHT };
                const centerA = { x: a.x + CARD_WIDTH / 2, y: a.y + CARD_MIN_HEIGHT / 2 };
                const centerB = { x: b.x + CARD_WIDTH / 2, y: b.y + CARD_MIN_HEIGHT / 2 };
                const start = anchorOnRect(rectA, centerB.x, centerB.y);
                const end = anchorOnRect(rectB, centerA.x, centerA.y);
                const isFocused = !!activeId && (e.source === activeId || e.target === activeId);
                return (
                  <line
                    key={`${e.source}-${e.target}-${i}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={isFocused ? "rgba(161,155,224,0.5)" : "rgba(255,255,255,0.12)"}
                    strokeWidth={1}
                    style={{ transition: "stroke 150ms ease" }}
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
                    opacity: isDimmed ? 0.38 : 1,
                    background: isHovered || isSelected || isDragging ? "#1B1B20" : "#151519",
                    borderColor: isSelected || isDragging ? "rgba(139,124,246,0.55)" : "rgba(255,255,255,0.08)",
                    cursor: isDragging ? "grabbing" : "grab",
                    zIndex: isDragging ? 30 : isSelected ? 2 : 1,
                    transform: isDragging ? "scale(1.035) translateY(-1px)" : "scale(1)",
                    boxShadow: isDragging
                      ? "0 16px 36px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,124,246,0.25)"
                      : "none",
                    transition: isDragging
                      ? "none"
                      : "opacity 150ms ease, border-color 150ms ease, background-color 150ms ease, transform 150ms ease, box-shadow 150ms ease",
                  }}
                  onPointerDown={(e) => handleCardPointerDown(e, n.id)}
                  onPointerEnter={() => setHoveredId(n.id)}
                  onPointerLeave={() => setHoveredId((h) => (h === n.id ? null : h))}
                >
                  {/* thin top accent instead of a glow bloom — quieter, more precise */}
                  <div
                    className="absolute inset-x-0 top-0 h-[2px] transition-opacity duration-150"
                    style={{
                      background: "linear-gradient(90deg, #8b7cf6, #6ea8fe)",
                      opacity: isSelected || isDragging ? 1 : isHovered ? 0.55 : 0,
                    }}
                  />
                  <div className="flex h-full items-start gap-2.5 px-3.5 py-3">
                    <span
                      className="flex h-5 w-5 flex-none items-center justify-center rounded-[5px] font-mono text-[10px] font-semibold"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: isHovered || isSelected || isDragging ? "#c9c1fb" : "#71717a",
                      }}
                    >
                      {initialOf(n.label)}
                    </span>
                    <span
                      className="pt-px text-[13px] font-medium leading-snug text-zinc-200"
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

        {/* control hints — quiet inline text, no boxed pill */}
        {showHints && (
          <div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-3 font-mono text-[10.5px] text-zinc-600">
            <span>
              <span className="text-zinc-500">drag</span> move
            </span>
            <span className="text-zinc-700">·</span>
            <span>
              <span className="text-zinc-500">scroll</span> zoom
            </span>
            <span className="text-zinc-700">·</span>
            <span>
              <span className="text-zinc-500">click</span> open
            </span>
          </div>
        )}

        {/* zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={(e) => zoomBy(1.25, { x: e.clientX, y: e.clientY })}
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => zoomBy(0.8, { x: e.clientX, y: e.clientY })}
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={fitToNodes}
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
            aria-label="Fit to view"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}