import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import dagre from "@dagrejs/dagre";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./graph-modal.css";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, FileText, Focus, Layers3, Network, PenLine, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { countBlocks } from "@/lib/pages";
import type { KnowledgePage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useKnowledge } from "@/store/knowledge";

const NODE_WIDTH = 214;
const NODE_HEIGHT = 86;
const LARGE_GRAPH_THRESHOLD = 24;
const FOCUS_SIBLING_RADIUS = 5;

type GraphMode = "overview" | "focus";

interface PageNodeData extends Record<string, unknown> {
  page: KnowledgePage;
  active: boolean;
  onOpen: (pageId: string) => void;
}

type PageGraphNode = Node<PageNodeData, "page">;

interface GraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GraphLayout {
  nodes: PageGraphNode[];
  edges: Edge[];
}

function getOrderedPageIds(pages: Record<string, KnowledgePage>, rootOrder: string[]): string[] {
  const ordered: string[] = [];
  const visited = new Set<string>();

  const visit = (pageId: string) => {
    if (visited.has(pageId) || !pages[pageId]) return;
    visited.add(pageId);
    ordered.push(pageId);
    pages[pageId].childrenIds.forEach(visit);
  };

  rootOrder.forEach(visit);
  Object.keys(pages).sort().forEach(visit);

  return ordered;
}

function getPageDepth(pages: Record<string, KnowledgePage>, pageId: string): number {
  let depth = 0;
  let cursor = pages[pageId];
  const visited = new Set<string>();

  while (cursor?.parentId && !visited.has(cursor.parentId)) {
    visited.add(cursor.parentId);
    depth += 1;
    cursor = pages[cursor.parentId];
  }

  return depth;
}

function formatPageDetail(page: KnowledgePage): string {
  if (page.kind === "whiteboard") {
    const count = page.whiteboard?.elements.length ?? 0;
    return `${count} ${count === 1 ? "element" : "elements"}`;
  }
  const count = countBlocks(page.content);
  return `${count} ${count === 1 ? "block" : "blocks"}`;
}

function addNearbyIds(ids: Set<string>, orderedIds: string[], centerId: string, radius: number) {
  const index = orderedIds.indexOf(centerId);
  if (index === -1) return;

  orderedIds.slice(Math.max(0, index - radius), index + radius + 1).forEach((id) => ids.add(id));
}

function getFocusIds(
  pages: Record<string, KnowledgePage>,
  rootOrder: string[],
  centerId: string,
): Set<string> {
  const ids = new Set<string>();
  const center = pages[centerId];
  if (!center) return ids;

  ids.add(centerId);

  let cursor: KnowledgePage | undefined = center;
  while (cursor?.parentId) {
    ids.add(cursor.parentId);
    cursor = pages[cursor.parentId];
  }

  if (center.parentId) {
    const parent = pages[center.parentId];
    if (parent) {
      ids.add(parent.id);
      addNearbyIds(ids, parent.childrenIds, centerId, FOCUS_SIBLING_RADIUS);
    }
  } else {
    addNearbyIds(ids, rootOrder, centerId, FOCUS_SIBLING_RADIUS);
  }

  center.childrenIds.forEach((childId) => {
    ids.add(childId);
    pages[childId]?.childrenIds.forEach((grandchildId) => ids.add(grandchildId));
  });

  return ids;
}

function buildLayout(
  orderedIds: string[],
  pages: Record<string, KnowledgePage>,
  visibleIds: Set<string>,
  activePageId: string | null,
  onOpenPage: (pageId: string) => void,
): GraphLayout {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "TB",
    align: "UL",
    nodesep: 44,
    ranksep: 88,
    marginx: 52,
    marginy: 52,
  });

  const visiblePages = orderedIds
    .filter((id) => visibleIds.has(id))
    .map((id) => pages[id])
    .filter(Boolean);

  visiblePages.forEach((page) => {
    graph.setNode(page.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  visiblePages.forEach((page) => {
    if (page.parentId && visibleIds.has(page.parentId)) {
      graph.setEdge(page.parentId, page.id);
    }
  });

  dagre.layout(graph);

  const nodes: PageGraphNode[] = visiblePages.map((page) => {
    const point = graph.node(page.id);
    return {
      id: page.id,
      type: "page",
      position: {
        x: point.x - NODE_WIDTH / 2,
        y: point.y - NODE_HEIGHT / 2,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      draggable: true,
      selectable: true,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: {
        page,
        active: page.id === activePageId,
        onOpen: onOpenPage,
      },
      ariaLabel: `${page.title || "Untitled page"}, ${formatPageDetail(page)}`,
    };
  });

  const edges: Edge[] = visiblePages.flatMap((page) => {
    if (!page.parentId || !visibleIds.has(page.parentId)) return [];
    return [
      {
        id: `${page.parentId}-${page.id}`,
        source: page.parentId,
        target: page.id,
        type: "default",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: "rgba(167, 139, 250, 0.48)",
        },
        style: {
          stroke: "rgba(167, 139, 250, 0.32)",
          strokeWidth: 1.35,
        },
      },
    ];
  });

  return { nodes, edges };
}

function PageNode({ data, selected }: NodeProps<PageGraphNode>) {
  const { page, active } = data;
  const childCount = page.childrenIds.length;

  return (
    <div
      onDoubleClick={(event) => {
        event.stopPropagation();
        data.onOpen(page.id);
      }}
      className={cn(
        "relative flex h-[86px] w-[214px] items-center gap-3 rounded-2xl border px-3.5 text-left",
        "bg-[linear-gradient(145deg,rgba(24,24,33,0.97),rgba(14,14,21,0.97))]",
        "shadow-[0_12px_35px_rgba(0,0,0,0.28)] transition-[border-color,box-shadow,transform] duration-300",
        selected
          ? "scale-[1.025] border-violet-400/80 shadow-[0_0_0_3px_rgba(139,92,246,0.15),0_18px_45px_rgba(0,0,0,0.38)]"
          : active
            ? "border-violet-400/45 shadow-[0_0_0_2px_rgba(139,92,246,0.09),0_12px_35px_rgba(0,0,0,0.28)]"
            : "border-white/[0.09] hover:border-violet-300/35 hover:shadow-[0_16px_38px_rgba(0,0,0,0.34)]",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-px !w-px !border-0 !bg-transparent !opacity-0"
      />

      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border",
          active ? "border-violet-400/30 bg-violet-400/12" : "border-white/[0.08] bg-white/[0.035]",
        )}
      >
        {page.avatarImage ? (
          <img src={page.avatarImage} alt="" className="size-full object-cover" draggable={false} />
        ) : page.icon ? (
          <span className="text-base leading-none">{page.icon}</span>
        ) : page.kind === "whiteboard" ? (
          <PenLine className="size-4 text-violet-200/75" />
        ) : (
          <FileText className="size-4 text-violet-200/75" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.13em] text-violet-200/45">
            {active ? "Current page" : page.parentId ? "Page" : "Root"}
          </span>
          {active && <span className="size-1.5 rounded-full bg-violet-400" />}
        </div>
        <p className="mt-0.5 overflow-hidden text-[13px] font-medium leading-[1.15rem] text-white/90 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {page.title || "Untitled"}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-white/35">
          <span>{formatPageDetail(page)}</span>
          {childCount > 0 && (
            <>
              <span className="size-0.5 rounded-full bg-white/25" />
              <span>
                {childCount} {childCount === 1 ? "branch" : "branches"}
              </span>
            </>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-px !w-px !border-0 !bg-transparent !opacity-0"
      />
    </div>
  );
}

const nodeTypes = { page: PageNode };

function GraphWorkspace({ onOpenChange }: Pick<GraphModalProps, "onOpenChange">) {
  const { state, select } = useKnowledge();
  const orderedIds = useMemo(
    () => getOrderedPageIds(state.pages, state.rootOrder),
    [state.pages, state.rootOrder],
  );
  const totalPages = orderedIds.length;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<GraphMode>(() =>
    totalPages > LARGE_GRAPH_THRESHOLD && state.activePageId ? "focus" : "overview",
  );
  const instanceRef = useRef<ReactFlowInstance<PageGraphNode, Edge> | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);

  const focusId = selectedId ?? state.activePageId ?? state.rootOrder[0] ?? orderedIds[0] ?? null;
  const overviewIds = useMemo(() => new Set(orderedIds), [orderedIds]);

  const openGraphPage = useCallback(
    (pageId: string) => {
      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      select(pageId);
      onOpenChange(false);
    },
    [onOpenChange, select],
  );

  const visibleIds = useMemo(() => {
    if (mode === "focus" && focusId) {
      return getFocusIds(state.pages, state.rootOrder, focusId);
    }
    return overviewIds;
  }, [focusId, mode, overviewIds, state.pages, state.rootOrder]);

  const layout = useMemo(
    () => buildLayout(orderedIds, state.pages, visibleIds, state.activePageId, openGraphPage),
    [openGraphPage, orderedIds, state.activePageId, state.pages, visibleIds],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<PageGraphNode>(layout.nodes);

  const selectedPage = selectedId ? state.pages[selectedId] : null;
  const selectedPageDepth = selectedPage ? getPageDepth(state.pages, selectedPage.id) : 0;
  const visibleEdgeCount = layout.edges.length;

  const edges = useMemo(() => {
    if (!selectedId) return layout.edges;

    return layout.edges.map((edge) => {
      const connected = edge.source === selectedId || edge.target === selectedId;
      return {
        ...edge,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: connected ? "rgba(196, 181, 253, 0.94)" : "rgba(167, 139, 250, 0.12)",
        },
        style: {
          stroke: connected ? "rgba(196, 181, 253, 0.9)" : "rgba(167, 139, 250, 0.1)",
          strokeWidth: connected ? 2.1 : 1,
          filter: connected ? "drop-shadow(0 0 5px rgba(139, 92, 246, 0.4))" : "none",
        },
      };
    });
  }, [layout.edges, selectedId]);

  useEffect(() => {
    setNodes(layout.nodes);

    const frame = window.requestAnimationFrame(() => {
      instanceRef.current?.fitView({
        padding: mode === "focus" ? 0.32 : 0.2,
        duration: 500,
        minZoom: 0.32,
        maxZoom: mode === "focus" ? 1.08 : 0.94,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [layout.nodes, mode, setNodes]);

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        selected: node.id === selectedId,
      })),
    );
  }, [selectedId, setNodes]);

  useEffect(
    () => () => {
      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    },
    [],
  );

  const clearSelection = useCallback(() => {
    if (clickTimeoutRef.current !== null) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setSelectedId(null);
  }, []);

  const handleNodeClick = useCallback(
    (_event: ReactMouseEvent, node: PageGraphNode) => {
      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current);
      }

      clickTimeoutRef.current = window.setTimeout(() => {
        setSelectedId(node.id);
        clickTimeoutRef.current = null;

        if (mode === "overview") {
          window.requestAnimationFrame(() => {
            instanceRef.current?.fitView({
              nodes: [node],
              padding: 1.8,
              duration: 460,
              minZoom: 0.75,
              maxZoom: 1.22,
            });
          });
        }
      }, 180);
    },
    [mode],
  );

  const setGraphMode = (nextMode: GraphMode) => {
    if (nextMode === "focus" && !focusId) return;
    setMode(nextMode);
  };

  if (totalPages === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#0c0c12]">
        <div className="max-w-xs text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/[0.06]">
            <Network className="size-5 text-violet-200/65" />
          </div>
          <p className="mt-4 text-sm font-medium text-white/80">No pages to map yet</p>
          <p className="mt-1 text-xs leading-5 text-white/40">
            Create a page and its relationships will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="calm-graph relative min-h-0 flex-1 overflow-hidden bg-[#0c0c12]">
      <ReactFlow<PageGraphNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={clearSelection}
        onInit={(instance) => {
          instanceRef.current = instance;
        }}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 0.94 }}
        minZoom={0.22}
        maxZoom={2.2}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        preventScrolling
        nodesConnectable={false}
        elementsSelectable
        edgesFocusable={false}
        onlyRenderVisibleElements
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        aria-label="Knowledge graph"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={25}
          size={1}
          color="rgba(255,255,255,0.065)"
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
          fitViewOptions={{
            padding: mode === "focus" ? 0.32 : 0.2,
            duration: 480,
            maxZoom: mode === "focus" ? 1.08 : 0.94,
          }}
        />
        {nodes.length > 20 && (
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor={(node) =>
              node.data.active ? "rgba(167, 139, 250, 0.88)" : "rgba(255, 255, 255, 0.28)"
            }
            nodeStrokeColor="rgba(255,255,255,0.1)"
            maskColor="rgba(8, 8, 13, 0.76)"
          />
        )}
      </ReactFlow>

      <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center rounded-xl border border-white/[0.08] bg-[#111119]/88 p-1 shadow-xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setGraphMode("overview")}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium transition-colors",
              mode === "overview"
                ? "bg-white/[0.09] text-white/90"
                : "text-white/40 hover:text-white/65",
            )}
          >
            <Layers3 className="size-3.5" />
            Overview
          </button>
          <button
            type="button"
            onClick={() => setGraphMode("focus")}
            disabled={!focusId}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35",
              mode === "focus"
                ? "bg-violet-400/14 text-violet-100"
                : "text-white/40 hover:text-white/65",
            )}
          >
            <Focus className="size-3.5" />
            Focus
          </button>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-[#111119]/78 px-3 py-2 text-[10px] text-white/40 shadow-lg backdrop-blur-xl">
          {nodes.length} {nodes.length === 1 ? "page" : "pages"}
          <span className="mx-1.5 text-white/20">·</span>
          {visibleEdgeCount} {visibleEdgeCount === 1 ? "link" : "links"}
          {mode === "focus" && totalPages > nodes.length && (
            <span className="ml-1.5 text-violet-200/60">of {totalPages}</span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 rounded-full",
          "border border-white/[0.07] bg-[#111119]/72 px-3 py-1.5 text-[10px] text-white/35 backdrop-blur-xl sm:block",
          nodes.length > 20 && "sm:hidden lg:block",
        )}
      >
        Drag to pan · Scroll to zoom · Double-click a page to open
      </div>

      <AnimatePresence>
        {selectedPage && (
          <motion.aside
            initial={{ opacity: 0, x: 18, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 18, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-4 right-4 top-16 z-20 flex w-[min(310px,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12121a]/94 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-200/55">
                Page details
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="flex size-7 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/70"
                aria-label="Close page details"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="flex size-11 items-center justify-center overflow-hidden rounded-xl border border-violet-300/15 bg-violet-400/[0.07]">
                {selectedPage.avatarImage ? (
                  <img src={selectedPage.avatarImage} alt="" className="size-full object-cover" />
                ) : selectedPage.icon ? (
                  <span className="text-lg leading-none">{selectedPage.icon}</span>
                ) : selectedPage.kind === "whiteboard" ? (
                  <PenLine className="size-4 text-violet-200/70" />
                ) : (
                  <FileText className="size-4 text-violet-200/70" />
                )}
              </div>

              <h3 className="mt-3 text-base font-medium leading-6 text-white/90">
                {selectedPage.title || "Untitled"}
              </h3>
              <p className="mt-1 text-xs leading-5 text-white/38">
                {selectedPage.parentId ? `Nested at level ${selectedPageDepth}` : "Top-level page"}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <p className="text-lg font-medium text-white/80">
                    {selectedPage.kind === "whiteboard"
                      ? (selectedPage.whiteboard?.elements.length ?? 0)
                      : countBlocks(selectedPage.content)}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/30">
                    {selectedPage.kind === "whiteboard" ? "Elements" : "Blocks"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <p className="text-lg font-medium text-white/80">
                    {selectedPage.childrenIds.length}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/30">
                    Branches
                  </p>
                </div>
              </div>

              {selectedPage.childrenIds.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/30">
                    Direct branches
                  </p>
                  <div className="mt-2 space-y-1">
                    {selectedPage.childrenIds.slice(0, 5).map((childId) => (
                      <button
                        key={childId}
                        type="button"
                        onClick={() => setSelectedId(childId)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-white/48 transition-colors hover:bg-white/[0.05] hover:text-white/72"
                      >
                        <span className="size-1 rounded-full bg-violet-400/65" />
                        <span className="truncate">
                          {state.pages[childId]?.title || "Untitled"}
                        </span>
                      </button>
                    ))}
                    {selectedPage.childrenIds.length > 5 && (
                      <p className="px-2 pt-1 text-[10px] text-white/25">
                        +{selectedPage.childrenIds.length - 5} more branches
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.07] p-3">
              <button
                type="button"
                onClick={() => {
                  select(selectedPage.id);
                  onOpenChange(false);
                }}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-violet-500/90 text-xs font-medium text-white shadow-[0_8px_24px_rgba(124,58,237,0.22)] transition-colors hover:bg-violet-400"
              >
                Open page
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

export function GraphModal({ open, onOpenChange }: GraphModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] w-[min(96vw,1280px)] max-w-none flex-col gap-0 overflow-hidden border-white/[0.1] bg-[#0e0e15] p-0 shadow-[0_32px_100px_rgba(0,0,0,0.62)] [&>button]:right-5 [&>button]:top-5 [&>button]:z-30 [&>button]:rounded-lg [&>button]:text-white/45">
        <header className="flex h-[64px] shrink-0 items-center border-b border-white/[0.07] px-5 pr-14">
          <div className="flex size-9 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/[0.07]">
            <Network className="size-4 text-violet-200/75" />
          </div>
          <div className="ml-3">
            <DialogTitle className="text-sm font-medium tracking-tight text-white/90">
              Knowledge graph
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[11px] text-white/35">
              Explore the structure of your workspace
            </DialogDescription>
          </div>
        </header>

        <ReactFlowProvider>
          <GraphWorkspace onOpenChange={onOpenChange} />
        </ReactFlowProvider>
      </DialogContent>
    </Dialog>
  );
}
