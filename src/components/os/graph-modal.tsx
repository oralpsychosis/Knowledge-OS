import { useState, useMemo } from "react";
import { FileText, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useKnowledge } from "@/store/knowledge";
import { countBlocks } from "@/lib/pages";
import type { KnowledgePage } from "@/lib/types";

interface NodeLayout {
  page: KnowledgePage;
  x: number;
  y: number;
  depth: number;
}

function layoutTree(pages: KnowledgePage[], rootOrder: string[], pageMap: Record<string, KnowledgePage>): { nodes: NodeLayout[]; edges: Array<{ from: string; to: string }> } {
  const edges: Array<{ from: string; to: string }> = [];
  const nodeList: NodeLayout[] = [];
  const H_GAP = 200;
  const V_GAP = 100;
  const PAD_X = 80;
  const PAD_Y = 50;

  function walk(ids: string[], depth: number, startX: number): number {
    let cursor = startX;
    for (const id of ids) {
      const p = pageMap[id];
      if (!p) continue;
      const w = 160;
      nodeList.push({ page: p, x: cursor, y: PAD_Y + depth * V_GAP, depth });
      if (p.parentId && pageMap[p.parentId]) {
        edges.push({ from: p.parentId, to: p.id });
      }
      if (p.childrenIds.length > 0) {
        const childWidth = p.childrenIds.length * H_GAP;
        const childStart = cursor + w / 2 - childWidth / 2;
        walk(p.childrenIds, depth + 1, Math.max(childStart, PAD_X));
        cursor = Math.max(cursor, childStart + childWidth + H_GAP);
      } else {
        cursor += H_GAP;
      }
    }
    return cursor;
  }

  walk(rootOrder, 0, PAD_X);
  return { nodes: nodeList, edges };
}

export function GraphModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, select } = useKnowledge();
  const [selected, setSelected] = useState<string | null>(null);

  const { nodes, edges } = useMemo(
    () => layoutTree(Object.values(state.pages), state.rootOrder, state.pages),
    [state],
  );

  const selectedPage = selected ? state.pages[selected] ?? null : null;

  const canvasW = useMemo(() => Math.max(800, nodes.length * 140), [nodes]);
  const canvasH = useMemo(() => Math.max(400, (Math.max(...nodes.map((n) => n.depth), 0) + 2) * 120), [nodes]);

  function openDocument(id: string) {
    select(id);
    onOpenChange(false);
  }

  function hierarchyLevel(page: KnowledgePage): string {
    if (page.parentId === null) return "Root Document";
    if (state.pages[page.parentId]?.parentId === null) return "Sub-page";
    return "Nested Page";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] border-white/10 bg-black/95 backdrop-blur-2xl shadow-2xl p-0 gap-0 flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div>
            <h2 className="text-[15px] font-semibold text-white/90">Knowledge Graph Visualization</h2>
            <p className="mt-0.5 text-[11px] text-white/35">
              Visual mapping of document hierarchy & connections
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/40 transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Graph canvas */}
          <div className="relative flex-1 overflow-auto bg-[#060608]">
            {/* Dot grid background */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
              {/* Connection lines */}
              {edges.map((e) => {
                const from = nodes.find((n) => n.page.id === e.from);
                const to = nodes.find((n) => n.page.id === e.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={`${e.from}-${e.to}`}
                    x1={from.x + 80}
                    y1={from.y + 36}
                    x2={to.x + 80}
                    y2={to.y}
                    stroke="rgba(139,92,246,0.25)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                );
              })}
            </svg>

            <div className="relative" style={{ width: canvasW, height: canvasH }}>
              {nodes.map((n) => {
                const isActive = state.activePageId === n.page.id;
                const isSelected = selected === n.page.id;
                return (
                  <button
                    key={n.page.id}
                    onClick={() => setSelected(n.page.id)}
                    onDoubleClick={() => openDocument(n.page.id)}
                    style={{ left: n.x, top: n.y, position: "absolute" }}
                    className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left text-[12px] transition-all w-[160px] ${
                      isActive
                        ? "border-violet-400/60 bg-violet-500/12 shadow-[0_0_24px_rgba(139,92,246,0.3)]"
                        : isSelected
                          ? "border-violet-400/40 bg-white/[0.06] shadow-[0_0_16px_rgba(139,92,246,0.15)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[16px]">{n.page.icon ?? <FileText className="h-3.5 w-3.5 text-white/30" />}</span>
                      <span className="flex-1 truncate font-medium text-white/80">{n.page.title || "Untitled"}</span>
                      {isActive && (
                        <span className="rounded border border-violet-400/30 bg-violet-500/15 px-1.5 py-0.5 text-[9px] text-violet-300">ACTIVE</span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[10px] text-white/35">
                      {countBlocks(n.page.content)} blocks
                      {n.page.childrenIds.length > 0 && ` · ${n.page.childrenIds.length} children`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inspector panel */}
          <div className="w-[260px] shrink-0 border-l border-white/10 p-4">
            {selectedPage ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-xl">
                    {selectedPage.icon ?? <FileText className="h-5 w-5 text-white/30" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[13px] font-medium text-white/90">{selectedPage.title || "Untitled"}</div>
                    <div className="text-[10px] text-white/35">{hierarchyLevel(selectedPage)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <div>
                    <div className="text-[10px] text-white/30">Created</div>
                    <div className="text-[12px] text-white/60">{new Date(selectedPage.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30">Blocks</div>
                    <div className="text-[12px] text-white/60">{countBlocks(selectedPage.content)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30">Children</div>
                    <div className="text-[12px] text-white/60">{selectedPage.childrenIds.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30">Level</div>
                    <div className="text-[12px] text-white/60">{hierarchyLevel(selectedPage)}</div>
                  </div>
                </div>

                <button
                  onClick={() => openDocument(selectedPage.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 py-2.5 text-[13px] font-medium text-violet-100 transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                >
                  Open Document →
                </button>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-[12px] text-white/25">
                  Select a node<br />to inspect
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
