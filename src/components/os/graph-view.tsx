"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

export interface GraphNode {
  id: string;
  label: string;
  group?: string;
  color?: string;
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
  selectedId?: string | null;
  className?: string;
  staticLayout?: boolean;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

const GROUP_PALETTE = [
  "#8b7cf6", // violet
  "#6ea8fe", // indigo-blue
  "#f472b6", // pink
  "#34d399", // teal
  "#fbbf24", // amber
  "#f87171", // red
];

function colorForGroup(group: string | undefined, fallback: string): string {
  if (!group) return fallback;
  let hash = 0;
  for (let i = 0; i < group.length; i++) hash = (hash * 31 + group.charCodeAt(i)) | 0;
  return GROUP_PALETTE[Math.abs(hash) % GROUP_PALETTE.length];
}

const DEFAULT_COLOR = "#8b7cf6";
const MIN_SCALE = 0.15;
const MAX_SCALE = 3;

export default function GraphView({
  nodes,
  edges,
  onNodeOpen,
  onNodeSelect,
  selectedId = null,
  className = "",
  staticLayout = false,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState({ x: 0, y: 0, k: 0.8 });
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const [tick, setTick] = useState(0);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(selectedId);
  const selected = selectedId !== undefined && selectedId !== null ? selectedId : internalSelectedId;

  const draggingRef = useRef<{ id: string; pointerId: number; moved: boolean } | null>(null);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; viewX: number; viewY: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const map = simNodesRef.current;
    const existingIds = new Set(nodes.map((n) => n.id));

    for (const id of Array.from(map.keys())) {
      if (!existingIds.has(id)) map.delete(id);
    }

    const ringRadius = 200;
    nodes.forEach((n, i) => {
      const existing = map.get(n.id);
      if (existing) {
        existing.label = n.label;
        existing.group = n.group;
        existing.color = n.color;
        return;
      }
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      map.set(n.id, {
        ...n,
        x: n.x ?? Math.cos(angle) * ringRadius + (Math.random() - 0.5) * 40,
        y: n.y ?? Math.sin(angle) * ringRadius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      });
    });

    setTick((t) => t + 1);
  }, [nodes]);

  useEffect(() => {
    if (typeof window === "undefined" || staticLayout) return;

    let raf = 0;
    let alpha = 1;
    const alphaMin = 0.005;
    const alphaDecay = 0.02;

    const step = () => {
      const map = simNodesRef.current;
      const list = Array.from(map.values());

      if (alpha > alphaMin && list.length > 0) {
        const REPEL = 2500;
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i];
            const b = list[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let distSq = dx * dx + dy * dy;
            if (distSq < 0.01) {
              dx = Math.random() - 0.5;
              dy = Math.random() - 0.5;
              distSq = 0.01;
            }
            const force = (REPEL / distSq) * alpha;
            const dist = Math.sqrt(distSq);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx += fx;
            a.vy += fy;
            b.vx -= fx;
            b.vy -= fy;
          }
        }

        const LINK_DIST = 120;
        const LINK_STRENGTH = 0.06;
        for (const e of edges) {
          const a = map.get(e.source);
          const b = map.get(e.target);
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const diff = (dist - LINK_DIST) * LINK_STRENGTH * alpha;
          const fx = (dx / dist) * diff;
          const fy = (dy / dist) * diff;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }

        const CENTER = 0.015;
        for (const n of list) {
          n.vx -= n.x * CENTER * alpha;
          n.vy -= n.y * CENTER * alpha;
        }

        const DAMPING = 0.82;
        for (const n of list) {
          if (n.fx !== null && n.fy !== null) {
            n.x = n.fx;
            n.y = n.fy;
            n.vx = 0;
            n.vy = 0;
            continue;
          }
          n.vx *= DAMPING;
          n.vy *= DAMPING;
          n.x += n.vx;
          n.y += n.vy;
        }

        alpha *= 1 - alphaDecay;
        setTick((t) => t + 1);
      }

      raf = window.requestAnimationFrame(step);
    };

    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [edges, staticLayout]);

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - size.width / 2 - view.x) / view.k,
        y: (sy - size.height / 2 - view.y) / view.k,
      };
    },
    [size.width, size.height, view]
  );

  const zoomBy = useCallback(
    (factor: number, pivot?: { x: number; y: number }) => {
      setView((v) => {
        const nextK = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.k * factor));
        if (!pivot) return { ...v, k: nextK };
        const worldX = (pivot.x - size.width / 2 - v.x) / v.k;
        const worldY = (pivot.y - size.height / 2 - v.y) / v.k;
        return {
          k: nextK,
          x: pivot.x - size.width / 2 - worldX * nextK,
          y: pivot.y - size.height / 2 - worldY * nextK,
        };
      });
    },
    [size.width, size.height]
  );

  const handleWheel = useCallback(
    (e: ReactWheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const pivot = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomBy(factor, pivot);
    },
    [zoomBy]
  );

  const resetView = useCallback(() => setView({ x: 0, y: 0, k: 0.8 }), []);

  const handleBackgroundPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (e.target !== svgRef.current) return;
      panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [view.x, view.y]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const pan = panRef.current;
      if (pan && pan.pointerId === e.pointerId) {
        const dx = e.clientX - pan.startX;
        const dy = e.clientY - pan.startY;
        setView((v) => ({ ...v, x: pan.viewX + dx, y: pan.viewY + dy }));
        return;
      }

      const drag = draggingRef.current;
      if (drag && drag.pointerId === e.pointerId) {
        drag.moved = true;
        const world = screenToWorld(e.clientX, e.clientY);
        const n = simNodesRef.current.get(drag.id);
        if (n) {
          n.fx = world.x;
          n.fy = world.y;
          setTick((t) => t + 1);
        }
      }
    },
    [screenToWorld]
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
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (panRef.current?.pointerId === e.pointerId) {
        panRef.current = null;
      }
      const drag = draggingRef.current;
      if (drag && drag.pointerId === e.pointerId) {
        const n = simNodesRef.current.get(drag.id);
        if (n) {
          n.fx = null;
          n.fy = null;
        }
        if (!drag.moved) {
          selectNode(drag.id, true);
        }
        draggingRef.current = null;
      }
    },
    [selectNode]
  );

  const handleNodePointerDown = useCallback((e: ReactPointerEvent<SVGGElement>, id: string) => {
    e.stopPropagation();
    draggingRef.current = { id, pointerId: e.pointerId, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, []);

  const simList = useMemo(() => Array.from(simNodesRef.current.values()), [tick]);
  const simMap = simNodesRef.current;

  const neighborIds = useMemo(() => {
    if (!hoveredId && !selected) return null;
    const focus = hoveredId ?? selected;
    const s = new Set<string>();
    for (const e of edges) {
      if (e.source === focus) s.add(e.target);
      if (e.target === focus) s.add(e.source);
    }
    return s;
  }, [edges, hoveredId, selected]);

  return (
    <div ref={containerRef} className={`relative h-full w-full overflow-hidden bg-[#08080A] ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(139,124,246,0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          backgroundPosition: `${view.x % 28}px ${view.y % 28}px`,
        }}
      />

      {size.width > 0 && size.height > 0 && (
        <svg
          ref={svgRef}
          className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing"
          onWheel={handleWheel}
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <filter id="graph-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="graph-glow-soft" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${size.width / 2 + view.x} ${size.height / 2 + view.y}) scale(${view.k})`}>
            <g>
              {edges.map((e, i) => {
                const a = simMap.get(e.source);
                const b = simMap.get(e.target);
                if (!a || !b) return null;
                const isFocused =
                  hoveredId === e.source ||
                  hoveredId === e.target ||
                  selected === e.source ||
                  selected === e.target;
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;
                return (
                  <path
                    key={`${e.source}-${e.target}-${i}`}
                    d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                    fill="none"
                    stroke={isFocused ? "#a78bfa" : "#2a2a33"}
                    strokeWidth={isFocused ? 1.8 : 1}
                    strokeOpacity={isFocused ? 0.95 : 0.45}
                    style={{ transition: "stroke 180ms ease, stroke-opacity 180ms ease" }}
                  />
                );
              })}
            </g>

            <g>
              {simList.map((n) => {
                const color = n.color ?? colorForGroup(n.group, DEFAULT_COLOR);
                const isHovered = hoveredId === n.id;
                const isSelected = selected === n.id;
                const isDimmed = !!neighborIds && !neighborIds.has(n.id) && !isHovered && !isSelected;
                const radius = isSelected ? 10 : isHovered ? 9 : 7;

                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x} ${n.y})`}
                    className="cursor-pointer"
                    style={{ opacity: isDimmed ? 0.35 : 1, transition: "opacity 180ms ease" }}
                    onPointerDown={(e) => handleNodePointerDown(e, n.id)}
                    onPointerEnter={() => setHoveredId(n.id)}
                    onPointerLeave={() => setHoveredId((h) => (h === n.id ? null : h))}
                  >
                    {(isSelected || isHovered) && (
                      <circle r={radius + 8} fill={color} opacity={0.15} filter="url(#graph-glow)" />
                    )}
                    <circle
                      r={radius}
                      fill={color}
                      opacity={isSelected || isHovered ? 1 : 0.85}
                      filter={isSelected ? "url(#graph-glow-soft)" : undefined}
                      stroke={isSelected ? "#ffffff" : "transparent"}
                      strokeWidth={isSelected ? 1.5 : 0}
                      style={{ transition: "r 150ms ease" }}
                    />
                    <text
                      y={radius + 18}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={isSelected ? 600 : 400}
                      fill={isHovered || isSelected ? "#ffffff" : "#94a3b8"}
                      style={{ userSelect: "none", transition: "fill 180ms ease" }}
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      )}

      <div className="absolute bottom-6 right-6 flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/40 p-1 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => zoomBy(1.25, { x: size.width / 2, y: size.height / 2 })}
          className="flex size-9 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(0.8, { x: size.width / 2, y: size.height / 2 })}
          className="flex size-9 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="flex size-9 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Reset view"
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  );
}