import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CloudUpload, Eraser, LoaderCircle, PenLine, RotateCcw, Trash2 } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import type { KnowledgePage, WhiteboardScene, WhiteboardStroke } from "@/lib/types";

interface WhiteboardEditorProps {
  page: KnowledgePage;
  syncing: boolean;
  onTitleChange: (title: string) => void;
  onSceneChange: (scene: WhiteboardScene) => void;
}

type Tool = "pen" | "eraser";
type SaveState = "saved" | "pending";

type DrawingPoint = { x: number; y: number };

const COLORS = ["#c4b5fd", "#ffffff", "#67e8f9", "#86efac", "#fde68a", "#fda4af"];
const SAVE_DELAY_MS = 450;
const PEN_SIZE = 3;
const ERASER_SIZE = 22;

function isStroke(element: unknown): element is WhiteboardStroke {
  if (!element || typeof element !== "object") return false;
  const maybe = element as Partial<WhiteboardStroke>;
  return (
    maybe.type === "stroke" &&
    (maybe.tool === "pen" || maybe.tool === "eraser") &&
    typeof maybe.color === "string" &&
    typeof maybe.size === "number" &&
    Array.isArray(maybe.points)
  );
}

function getInitialStrokes(scene: WhiteboardScene | undefined): WhiteboardStroke[] {
  if (!scene) return [];
  return scene.elements.filter(isStroke);
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: WhiteboardStroke) {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.size;
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color;

  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

  if (stroke.points.length === 1) {
    ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y + 0.1);
  } else {
    for (let index = 1; index < stroke.points.length; index += 1) {
      const current = stroke.points[index];
      const previous = stroke.points[index - 1];
      const midPoint = {
        x: (previous.x + current.x) / 2,
        y: (previous.y + current.y) / 2,
      };
      ctx.quadraticCurveTo(previous.x, previous.y, midPoint.x, midPoint.y);
    }
  }

  ctx.stroke();
  ctx.restore();
}

function redraw(canvas: HTMLCanvasElement, strokes: readonly WhiteboardStroke[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const stroke of strokes) drawStroke(ctx, stroke);
}

function createScene(strokes: readonly WhiteboardStroke[]): WhiteboardScene {
  return {
    version: 1,
    elements: strokes,
    appState: { viewBackgroundColor: "#0b0b10" },
  };
}

export default function WhiteboardEditor({
  page,
  syncing,
  onTitleChange,
  onSceneChange,
}: WhiteboardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStrokeRef = useRef<WhiteboardStroke | null>(null);
  const strokesRef = useRef<WhiteboardStroke[]>(getInitialStrokes(page.whiteboard));
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>(strokesRef.current);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [saveState, setSaveState] = useState<SaveState>("saved");

  const scheduleSave = useCallback(
    (nextStrokes: readonly WhiteboardStroke[]) => {
      setSaveState("pending");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onSceneChange(createScene(nextStrokes));
        setSaveState("saved");
      }, SAVE_DELAY_MS);
    },
    [onSceneChange],
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const rect = viewport.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    redraw(canvas, strokesRef.current);
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) redraw(canvas, strokes);
  }, [strokes]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        onSceneChange(createScene(strokesRef.current));
      }
    },
    [onSceneChange],
  );

  const getPoint = useCallback((event: React.PointerEvent<HTMLCanvasElement>): DrawingPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }, []);

  const beginStroke = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = getPoint(event);
      currentStrokeRef.current = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: "stroke",
        tool,
        color: tool === "eraser" ? "#000000" : color,
        size: tool === "eraser" ? ERASER_SIZE : PEN_SIZE,
        points: [point],
      };
    },
    [color, getPoint, tool],
  );

  const continueStroke = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const current = currentStrokeRef.current;
      if (!current) return;
      current.points.push(getPoint(event));
      const canvas = canvasRef.current;
      if (!canvas) return;
      redraw(canvas, [...strokesRef.current, current]);
    },
    [getPoint],
  );

  const endStroke = useCallback(() => {
    const current = currentStrokeRef.current;
    if (!current) return;
    currentStrokeRef.current = null;
    const nextStrokes = [...strokesRef.current, current];
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
    scheduleSave(nextStrokes);
  }, [scheduleSave]);

  const clearBoard = useCallback(() => {
    strokesRef.current = [];
    setStrokes([]);
    scheduleSave([]);
  }, [scheduleSave]);

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#0e0e14]">
      <header className="relative z-20 flex min-h-[66px] shrink-0 items-center gap-3 border-b border-white/[0.08] bg-black/45 pl-16 pr-4 backdrop-blur-xl md:px-5">
        <div className="min-w-0 flex-1">
          <Breadcrumbs pageId={page.id} />
          <div className="mt-1.5 flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10">
              <PenLine className="size-3.5 text-violet-200/80" />
            </span>
            <input
              value={page.title}
              autoFocus={page.title === ""}
              onChange={(event) => onTitleChange(event.target.value.replace(/\n/g, ""))}
              placeholder="Untitled whiteboard"
              aria-label="Whiteboard title"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-white/90 outline-none placeholder:text-white/25"
            />
          </div>
        </div>

        <div className="hidden items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-white/35 sm:flex">
          {saveState === "pending" ? (
            <>
              <LoaderCircle className="size-3 animate-spin text-violet-300/70" />
              Queued
            </>
          ) : syncing ? (
            <>
              <CloudUpload className="size-3 animate-pulse text-violet-300/70" />
              Syncing
            </>
          ) : (
            <>
              <Check className="size-3 text-emerald-300/70" />
              Autosaved
            </>
          )}
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.07] bg-[#0a0a0f]/80 px-4 py-3 md:px-5">
        <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} label="Pen">
          <PenLine className="size-4" />
        </ToolButton>
        <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")} label="Eraser">
          <Eraser className="size-4" />
        </ToolButton>
        <div className="mx-1 h-7 w-px bg-white/10" />
        <div className="flex items-center gap-1.5" aria-label="Pen color">
          {COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => {
                setColor(swatch);
                setTool("pen");
              }}
              aria-label={`Use ${swatch} ink`}
              className={`size-7 rounded-full border transition-transform ${
                color === swatch && tool === "pen"
                  ? "scale-110 border-white shadow-[0_0_18px_rgba(196,181,253,0.45)]"
                  : "border-white/15 hover:scale-105"
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
        <div className="min-w-3 flex-1" />
        <button
          type="button"
          onClick={clearBoard}
          disabled={strokes.length === 0}
          className="flex h-9 items-center gap-2 rounded-xl border border-red-300/15 bg-red-500/10 px-3 text-[11px] font-medium text-red-100/75 transition-colors hover:bg-red-500/20 hover:text-red-50 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {strokes.length === 0 ? <RotateCcw className="size-3.5" /> : <Trash2 className="size-3.5" />}
          Clear
        </button>
      </div>

      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden bg-[#08080a]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.16),transparent_42%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:100%_100%,32px_32px,32px_32px]" />
        {strokes.length === 0 && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-sm -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-500/10 text-violet-200/80">
              <PenLine className="size-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white/80">Draw freely</h2>
            <p className="mt-2 text-sm text-white/38">
              Sketch ideas with the pen, erase loose marks, and let autosave keep the board in your workspace.
            </p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="relative z-10 block h-full w-full touch-none cursor-crosshair"
          onPointerDown={beginStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
          aria-label="Whiteboard drawing canvas"
        />
      </div>
    </main>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 items-center gap-2 rounded-xl border px-3 text-[11px] font-medium transition-colors ${
        active
          ? "border-violet-300/25 bg-violet-500/18 text-violet-100"
          : "border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      {children}
      {label}
    </button>
  );
}
