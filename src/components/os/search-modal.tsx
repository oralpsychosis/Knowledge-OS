import { useState, useEffect, useRef } from "react";
import { Search, FileText } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useKnowledge } from "@/store/knowledge";
import type { KnowledgePage } from "@/lib/types";

export function SearchModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, select } = useKnowledge();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const pages = Object.values(state.pages);
  const results = query.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    : pages;

  function go(page: KnowledgePage) {
    select(page.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-black/90 backdrop-blur-2xl shadow-2xl p-0 gap-0">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-white/30" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages..."
            className="flex-1 bg-transparent text-[14px] text-white/80 outline-none placeholder:text-white/25"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="py-8 text-center text-[13px] text-white/25">No pages found</p>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => go(p)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-[13px]">
                {p.icon ?? <FileText className="h-3.5 w-3.5 text-white/30" />}
              </span>
              <span className="flex-1 truncate">{p.title || "Untitled"}</span>
              {state.activePageId === p.id && (
                <span className="rounded border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300">
                  ACTIVE
                </span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
