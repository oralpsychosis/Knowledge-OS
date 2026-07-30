import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, FileText, Plus, Trash2, Check } from "lucide-react";
import { useKnowledge } from "@/store/knowledge";

function Row({ id, depth }: { id: string; depth: number }) {
  const { state, select, addPage, deletePage } = useKnowledge();
  const page = state.pages[id];
  const [expanded, setExpanded] = useState(true);
  const [confirming, setConfirming] = useState(false);

  if (!page) return null;
  const active = state.activePageId === id;
  const hasChildren = page.childrenIds.length > 0;

  return (
    <div>
      <motion.div
        layout
        onClick={() => select(id)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`group relative flex h-8 cursor-pointer items-center gap-1 rounded-lg border pr-1 text-[13px] os-glow-hover ${
          active
            ? "os-glow-active border-white/10 bg-violet-500/12 text-white"
            : "border-transparent text-white/60 hover:bg-white/5 hover:text-white/90"
        }`}

        style={{ paddingLeft: 6 + depth * 14 }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-white/40 hover:text-white ${
            hasChildren ? "" : "invisible"
          }`}
        >
          <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.span>
        </button>

        {page.avatarImage ? (
          <img
            src={page.avatarImage}
            alt=""
            className="h-4 w-4 shrink-0 rounded-[4px] object-cover"
          />
        ) : page.icon ? (
          <span className="w-4 shrink-0 text-center text-[12px] leading-none">{page.icon}</span>
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-white/30" />
        )}

        <span className="min-w-0 flex-1 truncate">{page.title || "Untitled"}</span>

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            title="Add sub-page"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
              addPage(id);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-white/45 hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={confirming ? "Click again to delete" : "Delete"}
            onClick={(e) => {
              e.stopPropagation();
              if (confirming) {
                deletePage(id);
                return;
              }
              setConfirming(true);
              setTimeout(() => setConfirming(false), 3000);
            }}
            className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
              confirming
                ? "bg-red-500/25 text-red-300 opacity-100"
                : "text-white/45 hover:bg-white/10 hover:text-white"
            }`}
          >
            {confirming ? <Check className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </motion.div>

      <AnimatePresence initial={false}>
        {expanded && hasChildren && (
          <motion.div
            layout
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="overflow-hidden"
          >
            {page.childrenIds.map((cid) => (
              <Row key={cid} id={cid} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PageTree() {
  const { state } = useKnowledge();
  if (!state.rootOrder.length) {
    return (
      <p className="px-3 py-6 text-center text-[11px] uppercase tracking-widest text-white/25">
        No pages yet
      </p>
    );
  }
  return (
    <motion.div layout className="space-y-0.5">
      {state.rootOrder.map((id) => (
        <Row key={id} id={id} depth={0} />
      ))}
    </motion.div>
  );
}
