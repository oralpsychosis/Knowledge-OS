import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Ellipsis,
  FileText,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react";
import { useKnowledge } from "@/store/knowledge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function Row({ id, depth, onNavigate }: { id: string; depth: number; onNavigate?: () => void }) {
  const { state, select, addPage, deletePage, movePage } = useKnowledge();
  const page = state.pages[id];
  const [expanded, setExpanded] = useState(true);
  const [confirming, setConfirming] = useState(false);

  if (!page) return null;
  const active = state.activePageId === id;
  const hasChildren = page.childrenIds.length > 0;

  // Find position in sibling list
  const parentId = page.parentId;
  const siblings = parentId ? state.pages[parentId]?.childrenIds || [] : state.rootOrder;
  const idx = siblings.indexOf(id);
  const isFirst = idx === 0;
  const isLast = idx === siblings.length - 1;

  function requestDelete() {
    if (confirming) {
      deletePage(id);
      onNavigate?.();
      return;
    }

    setConfirming(true);
    setTimeout(() => setConfirming(false), 3000);
  }

  return (
    <div>
      <motion.div
        layout
        onClick={() => {
          select(id);
          onNavigate?.();
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`group relative flex h-8 cursor-pointer items-center gap-1 rounded-lg pr-1 text-[13px] transition-colors ${
          active
            ? "bg-white/[0.065] text-white/92"
            : "text-white/52 hover:bg-white/[0.04] hover:text-white/82"
        }`}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        {active && (
          <span className="absolute left-0 top-2 h-4 w-0.5 rounded-full bg-violet-300/80" />
        )}
        <button
          type="button"
          aria-label={
            expanded ? `Collapse ${page.title || "Untitled"}` : `Expand ${page.title || "Untitled"}`
          }
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
        ) : page.kind === "whiteboard" ? (
          <PenLine className="h-3.5 w-3.5 shrink-0 text-violet-200/60" />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-white/30" />
        )}

        <span className="min-w-0 flex-1 truncate">{page.title || "Untitled"}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Page actions for ${page.title || "Untitled"}`}
              onClick={(event) => event.stopPropagation()}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.07] hover:text-white/80 md:hidden"
            >
              <Ellipsis className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={5}
            collisionPadding={12}
            className="z-[80] w-48 border-white/10 bg-[#15151b] p-1.5 text-white/70 shadow-2xl md:hidden"
          >
            <DropdownMenuItem
              disabled={isFirst}
              onSelect={() => movePage(id, "up")}
              className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.065] focus:text-white"
            >
              <ChevronUp />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isLast}
              onSelect={() => movePage(id, "down")}
              className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.065] focus:text-white"
            >
              <ChevronDown />
              Move down
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setExpanded(true);
                addPage(id);
                onNavigate?.();
              }}
              className="rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.065] focus:text-white"
            >
              <Plus />
              Add sub-page
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.07]" />
            <DropdownMenuItem
              onSelect={requestDelete}
              className={`rounded-lg px-2.5 py-2 text-xs focus:bg-white/[0.065] ${
                confirming ? "text-red-300 focus:text-red-200" : "focus:text-white"
              }`}
            >
              {confirming ? <Check /> : <Trash2 />}
              {confirming ? "Confirm delete" : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:flex">
          <button
            type="button"
            disabled={isFirst}
            aria-label={`Move ${page.title || "Untitled"} up`}
            onClick={(e) => {
              e.stopPropagation();
              movePage(id, "up");
            }}
            className={`flex h-6 w-6 items-center justify-center rounded-md text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent`}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            disabled={isLast}
            aria-label={`Move ${page.title || "Untitled"} down`}
            onClick={(e) => {
              e.stopPropagation();
              movePage(id, "down");
            }}
            className={`flex h-6 w-6 items-center justify-center rounded-md text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent`}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Add sub-page"
            aria-label={`Add sub-page to ${page.title || "Untitled"}`}
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
            aria-label={
              confirming
                ? `Confirm delete ${page.title || "Untitled"}`
                : `Delete ${page.title || "Untitled"}`
            }
            onClick={(e) => {
              e.stopPropagation();
              requestDelete();
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
              <Row key={cid} id={cid} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PageTree({ onNavigate }: { onNavigate?: () => void }) {
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
        <Row key={id} id={id} depth={0} onNavigate={onNavigate} />
      ))}
    </motion.div>
  );
}
