import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { 
  Circle, 
  Eraser, 
  Minus, 
  PenLine, 
  Square, 
  Type, 
  Trash2,
  Undo2,
  Redo2,
  PaintBucket
} from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import type { KnowledgePage, WhiteboardScene, WhiteboardElement, WhiteboardPoint } from "@/lib/types";

interface WhiteboardEditorProps {
  page: KnowledgePage;
  syncing: boolean;
  onTitleChange: (title: string) => void;
  onSceneChange: (scene: WhiteboardScene) => void;
}

type Tool = "pen" | "eraser" | "rectangle" | "circle" | "line" | "text";
const COLORS = ["#c4b5fd", "#ffffff", "#67e8f9", "#86efac", "#fde68a", "#fda4af"];
const SAVE_DELAY_MS = 600;
const PEN_SIZE = 2.5;
const ERASER_SIZE = 24;

function drawElement(ctx: CanvasRenderingContext2D, el: WhiteboardElement) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = el.size;
  ctx.strokeStyle = el.color;
  ctx.fillStyle = el.color;

  // Professional shadow/glow for all elements
  ctx.shadowBlur = 4;
  ctx.shadowColor = "rgba(0,0,0,0.4)";

  if (el.type === "stroke") {
    if (!el.points || el.points.length === 0) return;
    ctx.globalCompositeOperation = el.tool === "eraser" ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(el.points[0].x, el.points[0].y);
    for (let i = 1; i < el.points.length; i++) {
      const mid = { x: (el.points[i-1].x + el.points[i].x) / 2, y: (el.points[i-1].y + el.points[i].y) / 2 };
      ctx.quadraticCurveTo(el.points[i-1].x, el.points[i-1].y, mid.x, mid.y);
    }
    ctx.stroke();
  } else if (el.type === "rectangle") {
    if (el.fill) {
      ctx.globalAlpha = 0.15;
      ctx.fillRect(el.x, el.y, el.width || 0, el.height || 0);
      ctx.globalAlpha = 1.0;
    }
    ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
  } else if (el.type === "circle") {
    ctx.beginPath();
    const rx = (el.width || 0) / 2;
    const ry = (el.height || 0) / 2;
    ctx.ellipse(el.x + rx, el.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
    if (el.fill) {
      ctx.globalAlpha = 0.15;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    ctx.stroke();
  } else if (el.type === "line") {
    if (!el.points || el.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(el.points[0].x, el.points[0].y);
    ctx.lineTo(el.points[1].x, el.points[1].y);
    ctx.stroke();
  } else if (el.type === "text" && el.text) {
    ctx.shadowBlur = 0; // Disable shadow for text for clarity
    ctx.font = `600 20px "Inter", system-ui, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(el.text, el.x, el.y);
  }
  ctx.restore();
}

function redraw(canvas: HTMLCanvasElement, elements: readonly WhiteboardElement[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  elements.forEach(el => drawElement(ctx, el));
}

export default function WhiteboardEditor({ page, syncing, onTitleChange, onSceneChange }: WhiteboardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  
  const [elements, setElements] = useState<WhiteboardElement[]>(page.whiteboard?.elements || []);
  const [history, setHistory] = useState<WhiteboardElement[][]>([page.whiteboard?.elements || []]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [fill, setFill] = useState(true);
  const [activeElement, setActiveElement] = useState<WhiteboardElement | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });

  const pushToHistory = useCallback((nextElements: WhiteboardElement[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(nextElements);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setElements(nextElements);
    
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onSceneChange({ version: 2, elements: nextElements, appState: { viewBackgroundColor: "#08080a" } });
    }, SAVE_DELAY_MS);
  }, [history, historyIndex, onSceneChange]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setElements(prev);
      onSceneChange({ version: 2, elements: prev });
    }
  }, [history, historyIndex, onSceneChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setElements(next);
      onSceneChange({ version: 2, elements: next });
    }
  }, [history, historyIndex, onSceneChange]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [undo, redo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !viewportRef.current) return;
    const resize = () => {
      const rect = viewportRef.current!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      ctx?.scale(dpr, dpr);
      redraw(canvas, elements);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [elements]);

  const getPoint = (e: React.PointerEvent): WhiteboardPoint => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isTyping) return;
    const start = getPoint(e);
    const id = crypto.randomUUID();
    
    if (tool === "text") {
      setTextPos(start);
      setIsTyping(true);
      setTimeout(() => textInputRef.current?.focus(), 10);
      return;
    }

    const newEl: WhiteboardElement = {
      id,
      type: tool === "pen" || tool === "eraser" ? "stroke" : tool,
      x: start.x,
      y: start.y,
      color: tool === "eraser" ? "#08080a" : color,
      size: tool === "eraser" ? ERASER_SIZE : PEN_SIZE,
      points: [start],
      fill: tool === "rectangle" || tool === "circle" ? fill : false,
      tool: tool === "eraser" ? "eraser" : "pen",
    };
    setActiveElement(newEl);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeElement) return;
    const current = getPoint(e);
    
    const updated = { ...activeElement };
    if (updated.type === "stroke") {
      updated.points = [...(updated.points || []), current];
    } else {
      updated.width = current.x - updated.x;
      updated.height = current.y - updated.y;
      if (updated.type === "line") updated.points = [updated.points![0], current];
    }
    
    setActiveElement(updated);
    redraw(canvasRef.current!, [...elements, updated]);
  };

  const handlePointerUp = () => {
    if (!activeElement) return;
    pushToHistory([...elements, activeElement]);
    setActiveElement(null);
  };

  const handleTextSubmit = (text: string) => {
    if (text.trim()) {
      const newText: WhiteboardElement = {
        id: crypto.randomUUID(),
        type: "text",
        x: textPos.x,
        y: textPos.y,
        text: text.trim(),
        color,
        size: PEN_SIZE,
      };
      pushToHistory([...elements, newText]);
    }
    setIsTyping(false);
  };

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[#0e0e14]">
      <header className="relative z-20 flex min-h-[66px] shrink-0 items-center gap-3 border-b border-white/[0.08] bg-black/45 pl-16 pr-4 backdrop-blur-xl md:px-5">
        <div className="min-w-0 flex-1">
          <Breadcrumbs pageId={page.id} />
          <input
            value={page.title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled whiteboard"
            className="mt-1 block w-full bg-transparent text-[15px] font-medium text-white/90 outline-none placeholder:text-white/25"
          />
        </div>
        <div className="flex items-center gap-1 border-l border-white/10 pl-3">
          <button onClick={undo} disabled={historyIndex === 0} title="Undo (Ctrl+Z)" className="p-2 text-white/40 hover:text-white disabled:opacity-20 transition"><Undo2 size={16} /></button>
          <button onClick={redo} disabled={historyIndex === history.length - 1} title="Redo (Ctrl+Y)" className="p-2 text-white/40 hover:text-white disabled:opacity-20 transition"><Redo2 size={16} /></button>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-1.5 border-b border-white/[0.07] bg-[#0a0a0f]/80 px-4 py-2.5 md:px-5 overflow-x-auto no-scrollbar">
        <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} icon={<PenLine size={15} />} />
        <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} icon={<Eraser size={15} />} />
        <div className="mx-1 h-5 w-px bg-white/10" />
        <ToolBtn active={tool === "rectangle"} onClick={() => setTool("rectangle")} icon={<Square size={15} />} />
        <ToolBtn active={tool === "circle"} onClick={() => setTool("circle")} icon={<Circle size={15} />} />
        <ToolBtn active={tool === "line"} onClick={() => setTool("line")} icon={<Minus size={15} />} />
        <ToolBtn active={tool === "text"} onClick={() => setTool("text")} icon={<Type size={15} />} />
        
        <div className="mx-1 h-5 w-px bg-white/10" />
        <div className="flex items-center gap-1.5">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} className={`size-6 rounded-full border-2 transition ${color === c ? "border-white scale-110 shadow-lg" : "border-transparent opacity-50 hover:opacity-100"}`} style={{ backgroundColor: c }} />
          ))}
        </div>
        
        <button 
          onClick={() => setFill(!fill)} 
          className={`ml-1 flex size-9 items-center justify-center rounded-lg transition ${fill ? "bg-violet-500/20 text-violet-100" : "text-white/30 hover:text-white"}`}
          title="Toggle Fill"
        >
          <PaintBucket size={15} />
        </button>

        <div className="flex-1" />
        <button onClick={() => { pushToHistory([]); }} className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-200 hover:bg-red-500/20 transition"><Trash2 size={14} /> Clear</button>
      </div>

      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden bg-[#08080a] cursor-crosshair">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.12),transparent_42%),linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_100%,40px_40px,40px_40px]" />
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute inset-0 block touch-none"
        />
        {isTyping && (
          <div className="absolute z-50 px-2 py-1 bg-white/5 rounded border border-white/10 backdrop-blur-md" style={{ left: textPos.x, top: textPos.y }}>
            <input
              ref={textInputRef}
              autoFocus
              className="min-w-[120px] border-none bg-transparent font-semibold text-white outline-none"
              style={{ color, fontSize: `18px` }}
              onBlur={(e) => handleTextSubmit(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit((e.target as HTMLInputElement).value)}
            />
          </div>
        )}
      </div>
    </main>
  );
}

function ToolBtn({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-lg transition ${active ? "bg-violet-500/20 text-violet-100 shadow-[inset_0_0_12px_rgba(139,92,246,0.15)]" : "text-white/40 hover:bg-white/5 hover:text-white"}`}
    >
      {icon}
    </button>
  );
}