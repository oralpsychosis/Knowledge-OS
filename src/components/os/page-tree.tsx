import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  DragDropProvider,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import { Check, ChevronRight, FileText, PenLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { collectDescendants } from "@/lib/pages";
import type { KnowledgeOSState, KnowledgePage } from "@/lib/types";
import { useKnowledge } from "@/store/knowledge";

type DragData = { kind: "page"; pageId: string };
type DropData = { kind: "page-row"; pageId: string } | { kind: "workspace-root" };

type DropIntent = { kind: "before" | "after" | "inside"; targetId: string } | { kind: "root" };

type DragOperationLike = {
  source: { data: Record<string, unknown> } | null;
  target: { data: Record<string, unknown>; element?: Element } | null;
  position: { current: { x: number; y: number } };
};

function pageIdFromData(data: Record<string, unknown> | undefined): string | null {
  return data?.kind === "page" && typeof data.pageId === "string" ? data.pageId : null;
}

function resolveDropIntent(operation: DragOperationLike): DropIntent | null {
  const target = operation.target;
  if (!target) return null;

  if (target.data.kind === "workspace-root") return { kind: "root" };
  if (target.data.kind !== "page-row" || typeof target.data.pageId !== "string") return null;

  const bounds = target.element?.getBoundingClientRect();
  if (!bounds) return { kind: "inside", targetId: target.data.pageId };

  const offset = (operation.position.current.y - bounds.top) / bounds.height;
  if (offset < 0.24) return { kind: "before", targetId: target.data.pageId };
  if (offset > 0.76) return { kind: "after", targetId: target.data.pageId };
  return { kind: "inside", targetId: target.data.pageId };
}

function sameIntent(left: DropIntent | null, right: DropIntent | null): boolean {
  if (!left || !right) return left === right;
  return left.kind === right.kind && (left.kind === "root" || left.targetId === right.targetId);
}

function pageOrder(state: KnowledgeOSState, parentId: string | null): string[] {
  return parentId ? (state.pages[parentId]?.childrenIds ?? []) : state.rootOrder;
}

function moveTargetForIntent(
  state: KnowledgeOSState,
  sourceId: string,
  intent: DropIntent,
): { parentId: string | null; index: number } | null {
  const source = state.pages[sourceId];
  if (!source) return null;

  let parentId: string | null;
  let index: number;

  if (intent.kind === "root") {
    parentId = null;
    index = state.rootOrder.length;
  } else {
    const target = state.pages[intent.targetId];
    if (!target) return null;

    if (intent.kind === "inside") {
      parentId = target.id;
      index = target.childrenIds.length;
    } else {
      parentId = target.parentId;
      const siblings = pageOrder(state, parentId);
      const targetIndex = siblings.indexOf(target.id);
      if (targetIndex === -1) return null;
      index = targetIndex + (intent.kind === "after" ? 1 : 0);
    }
  }

  const sourceOrder = pageOrder(state, source.parentId);
  const sourceIndex = sourceOrder.indexOf(sourceId);
  if (source.parentId === parentId && sourceIndex !== -1 && sourceIndex < index) index -= 1;

  return { parentId, index };
}

function wouldChangeLocation(
  state: KnowledgeOSState,
  id: string,
  target: { parentId: string | null; index: number },
): boolean {
  const page = state.pages[id];
  if (!page) return false;
  if (page.parentId !== target.parentId) return true;

  const order = pageOrder(state, page.parentId);
  const currentIndex = order.indexOf(id);
  return currentIndex !== Math.max(0, Math.min(target.index, order.length - 1));
}

function PageGlyph({ page }: { page: KnowledgePage }) {
  if (page.avatarImage) {
    return (
      <img src={page.avatarImage} alt="" className="h-4 w-4 shrink-0 rounded-[4px] object-cover" />
    );
  }
  if (page.icon) {
    return <span className="w-4 shrink-0 text-center text-[12px] leading-none">{page.icon}</span>;
  }
  if (page.kind === "whiteboard")
    return <PenLine className="h-3.5 w-3.5 shrink-0 text-violet-200/60" />;
  return <FileText className="h-3.5 w-3.5 shrink-0 text-white/30" />;
}

function RootDropZone({
  active,
  activeIntent,
}: {
  active: boolean;
  activeIntent: DropIntent | null;
}) {
  const { ref, isDropTarget } = useDroppable<DropData>({
    id: "workspace-root-drop",
    data: { kind: "workspace-root" },
    collisionPriority: -1,
    accept: (source) => pageIdFromData(source.data) !== null,
  });
  const highlighted = activeIntent?.kind === "root" || isDropTarget;

  return (
    <AnimatePresence initial={false}>
      {active && (
        <motion.div
          ref={ref}
          initial={{ height: 0, opacity: 0, marginBottom: 0 }}
          animate={{ height: 28, opacity: 1, marginBottom: 4 }}
          exit={{ height: 0, opacity: 0, marginBottom: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className={`flex items-center justify-center overflow-hidden rounded-lg border text-[10px] font-medium uppercase tracking-[0.16em] transition-colors ${
            highlighted
              ? "border-violet-300/65 bg-violet-500/18 text-violet-100"
              : "border-dashed border-white/12 bg-white/[0.02] text-white/35"
          }`}
        >
          Move to top level
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({
  id,
  depth,
  expandedIds,
  onExpandedChange,
  onAddChild,
  activeDragId,
  dropIntent,
}: {
  id: string;
  depth: number;
  expandedIds: ReadonlySet<string>;
  onExpandedChange: (id: string, expanded: boolean) => void;
  onAddChild: (id: string) => void;
  activeDragId: string | null;
  dropIntent: DropIntent | null;
}) {
  const { state, select, deletePage } = useKnowledge();
  const page = state.pages[id];
  const [confirming, setConfirming] = useState(false);

  const { ref: draggableRef, isDragging } = useDraggable<DragData>({
    id: `page-drag-${id}`,
    data: { kind: "page", pageId: id },
    type: "page",
  });
  const { ref: droppableRef } = useDroppable<DropData>({
    id: `page-drop-${id}`,
    data: { kind: "page-row", pageId: id },
    accept: (source) => {
      const sourceId = pageIdFromData(source.data);
      return (
        sourceId !== null && sourceId !== id && !collectDescendants(state, sourceId).includes(id)
      );
    },
  });

  const setRowRef = useCallback(
    (element: Element | null) => {
      draggableRef(element);
      droppableRef(element);
    },
    [draggableRef, droppableRef],
  );
  const active = state.activePageId === id;
  const hasChildren = Boolean(page?.childrenIds.length);
  const expanded = expandedIds.has(id);
  const isTarget = dropIntent?.kind !== "root" && dropIntent?.targetId === id;
  const isInsideTarget = isTarget && dropIntent.kind === "inside";
  const linePosition = isTarget && dropIntent.kind !== "inside" ? dropIntent.kind : null;
  const dragging = activeDragId !== null;

  useEffect(() => {
    if (!isInsideTarget || expanded) return;
    const timer = window.setTimeout(() => onExpandedChange(id, true), 560);
    return () => window.clearTimeout(timer);
  }, [expanded, id, isInsideTarget, onExpandedChange]);

  if (!page) return null;

  return (
    <div className="relative">
      <motion.div
        ref={setRowRef}
        data-page-tree-row={id}
        layout
        onClick={() => {
          if (!isDragging) select(id);
        }}
        whileHover={dragging ? undefined : { scale: 1.01 }}
        whileTap={dragging ? undefined : { scale: 0.985 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`group relative flex h-8 select-none items-center gap-1 rounded-lg border pr-1 text-[13px] os-glow-hover transition-opacity ${
          isDragging
            ? "border-white/8 bg-white/[0.02] opacity-35"
            : isInsideTarget
              ? "border-violet-300/60 bg-violet-500/16 text-white shadow-[0_0_18px_rgba(139,92,246,0.2)]"
              : active
                ? "os-glow-active border-white/10 bg-violet-500/12 text-white"
                : "border-transparent text-white/60 hover:cursor-grab hover:bg-white/5 hover:text-white/90"
        }`}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        {linePosition && (
          <motion.span
            layoutId="page-tree-drop-line"
            className={`pointer-events-none absolute right-1 h-0.5 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.9)] ${
              linePosition === "before" ? "-top-0.5" : "-bottom-0.5"
            }`}
            style={{ left: 6 + depth * 14 }}
          />
        )}

        <button
          type="button"
          aria-label={
            hasChildren
              ? `${expanded ? "Collapse" : "Expand"} ${page.title || "Untitled"}`
              : undefined
          }
          onClick={(event) => {
            event.stopPropagation();
            onExpandedChange(id, !expanded);
          }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-white/40 hover:text-white ${
            hasChildren ? "" : "invisible"
          }`}
        >
          <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.span>
        </button>

        <PageGlyph page={page} />
        <span className="min-w-0 flex-1 truncate">{page.title || "Untitled"}</span>

        {isInsideTarget && dragging ? (
          <span className="mr-1 shrink-0 text-[9px] font-medium uppercase tracking-[0.12em] text-violet-100">
            Nest here
          </span>
        ) : (
          <div
            className={`flex shrink-0 items-center gap-0.5 transition-opacity ${dragging ? "opacity-0" : "opacity-0 group-hover:opacity-100"}`}
          >
            <button
              type="button"
              title="Add sub-page"
              onClick={(event) => {
                event.stopPropagation();
                onAddChild(id);
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
              onClick={(event) => {
                event.stopPropagation();
                if (confirming) {
                  deletePage(id);
                  return;
                }
                setConfirming(true);
                window.setTimeout(() => setConfirming(false), 3000);
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
        )}
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
            {page.childrenIds.map((childId) => (
              <Row
                key={childId}
                id={childId}
                depth={depth + 1}
                expandedIds={expandedIds}
                onExpandedChange={onExpandedChange}
                onAddChild={onAddChild}
                activeDragId={activeDragId}
                dropIntent={dropIntent}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PageDragPreview({ page }: { page: KnowledgePage }) {
  const childrenLabel = page.childrenIds.length > 0 ? `${page.childrenIds.length} nested` : null;
  return (
    <div className="flex max-w-[220px] items-center gap-2 rounded-lg border border-violet-200/30 bg-[#171523]/95 px-2.5 py-2 text-[12px] text-white shadow-2xl shadow-black/60 backdrop-blur-xl">
      <PageGlyph page={page} />
      <span className="min-w-0 flex-1 truncate font-medium">{page.title || "Untitled"}</span>
      {childrenLabel && (
        <span className="shrink-0 text-[10px] text-violet-200/70">{childrenLabel}</span>
      )}
    </div>
  );
}

export function PageTree() {
  const { state, addPage, movePage } = useKnowledge();
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(Object.keys(state.pages)),
  );
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dropIntent, setDropIntent] = useState<DropIntent | null>(null);

  const setExpanded = useCallback((id: string, expanded: boolean) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (expanded) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const addChild = useCallback(
    (id: string) => {
      setExpanded(id, true);
      addPage(id);
    },
    [addPage, setExpanded],
  );

  const updateDropIntent = useCallback((operation: DragOperationLike) => {
    const nextIntent = resolveDropIntent(operation);
    setDropIntent((current) => (sameIntent(current, nextIntent) ? current : nextIntent));
  }, []);

  const onDragEnd = useCallback(
    (event: { operation: DragOperationLike; canceled: boolean }) => {
      const sourceId = pageIdFromData(event.operation.source?.data);
      const intent = resolveDropIntent(event.operation);
      const source = sourceId ? state.pages[sourceId] : null;
      const originalIndex = source ? pageOrder(state, source.parentId).indexOf(source.id) : -1;

      setActiveDragId(null);
      setDropIntent(null);

      if (event.canceled || !sourceId || !source || !intent || originalIndex === -1) return;
      const target = moveTargetForIntent(state, sourceId, intent);
      if (!target || !wouldChangeLocation(state, sourceId, target)) return;

      movePage(sourceId, target.parentId, target.index);
      if (target.parentId) setExpanded(target.parentId, true);

      const destinationLabel = target.parentId
        ? `under ${state.pages[target.parentId]?.title || "Untitled"}`
        : "to top level";
      toast.success(`Moved ${source.title || "Untitled"} ${destinationLabel}`, {
        action: {
          label: "Undo",
          onClick: () => movePage(sourceId, source.parentId, originalIndex),
        },
      });
    },
    [movePage, setExpanded, state],
  );

  const activePage = activeDragId ? state.pages[activeDragId] : null;

  if (!state.rootOrder.length) {
    return (
      <p className="px-3 py-6 text-center text-[11px] uppercase tracking-widest text-white/25">
        No pages yet
      </p>
    );
  }

  return (
    <DragDropProvider
      sensors={(defaults) => [
        ...defaults.filter((sensor) => sensor !== PointerSensor),
        PointerSensor.configure({
          activationConstraints(event) {
            if (event.pointerType === "touch") {
              return [
                new PointerActivationConstraints.Delay({ value: 250, tolerance: { x: 5, y: 5 } }),
              ];
            }
            return [new PointerActivationConstraints.Distance({ value: 6 })];
          },
        }),
      ]}
      onDragStart={({ operation }) => {
        setActiveDragId(pageIdFromData(operation.source?.data));
        setDropIntent(null);
      }}
      onDragMove={({ operation }) => updateDropIntent(operation)}
      onDragOver={({ operation }) => updateDropIntent(operation)}
      onDragEnd={onDragEnd}
    >
      <motion.div layout className="space-y-0.5">
        <RootDropZone active={activeDragId !== null} activeIntent={dropIntent} />
        {state.rootOrder.map((id) => (
          <Row
            key={id}
            id={id}
            depth={0}
            expandedIds={expandedIds}
            onExpandedChange={setExpanded}
            onAddChild={addChild}
            activeDragId={activeDragId}
            dropIntent={dropIntent}
          />
        ))}
      </motion.div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
        {activePage ? <PageDragPreview page={activePage} /> : null}
      </DragOverlay>
    </DragDropProvider>
  );
}
