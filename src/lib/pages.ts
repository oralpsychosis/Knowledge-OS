import type {
  JSONContent,
  KnowledgeOSState,
  KnowledgePage,
  PageKind,
  WhiteboardScene,
} from "./types";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function emptyDoc(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function emptyWhiteboard(): WhiteboardScene {
  return {
    version: 1,
    elements: [],
    appState: {
      gridModeEnabled: false,
      scrollX: 0,
      scrollY: 0,
      viewBackgroundColor: "#f5f5f8",
    },
  };
}

export function createPage(
  parentId: string | null = null,
  kind: PageKind = "document",
): KnowledgePage {
  const now = Date.now();
  return {
    id: uid(),
    title: "",
    kind,
    parentId,
    childrenIds: [],
    content: emptyDoc(),
    whiteboard: kind === "whiteboard" ? emptyWhiteboard() : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function addPage(
  state: KnowledgeOSState,
  parentId: string | null,
  kind: PageKind = "document",
): KnowledgeOSState {
  const page = createPage(parentId, kind);
  const pages = { ...state.pages, [page.id]: page };
  let rootOrder = state.rootOrder;

  if (parentId && pages[parentId]) {
    pages[parentId] = {
      ...pages[parentId],
      childrenIds: [...pages[parentId].childrenIds, page.id],
      updatedAt: Date.now(),
    };
  } else {
    rootOrder = [...rootOrder, page.id];
  }

  return { pages, rootOrder, activePageId: page.id };
}

/**
 * Moves a page (and its descendant subtree) to an ordered position under a new parent.
 * The page map remains flat; only the source/destination order lists and the page's
 * parent pointer change. `index` is expressed in the destination order after the
 * source page has been removed.
 */
export function movePage(
  state: KnowledgeOSState,
  id: string,
  parentId: string | null,
  index: number,
): KnowledgeOSState {
  const page = state.pages[id];
  if (!page) return state;
  if (parentId === id || (parentId && !state.pages[parentId])) return state;

  // A page moves together with its subtree, so a descendant can never become its parent.
  if (parentId && collectDescendants(state, id).includes(parentId)) return state;

  const previousParentId = page.parentId;
  const sourceOrder = previousParentId
    ? state.pages[previousParentId]?.childrenIds
    : state.rootOrder;
  if (!sourceOrder) return state;

  const sourceIndex = sourceOrder.indexOf(id);
  if (sourceIndex === -1) return state;

  const isSameParent = previousParentId === parentId;
  const destinationOrder = isSameParent
    ? sourceOrder
    : parentId
      ? state.pages[parentId].childrenIds
      : state.rootOrder;
  const sourceWithoutPage = sourceOrder.filter((pageId) => pageId !== id);
  const baseDestination = isSameParent ? sourceWithoutPage : [...destinationOrder];

  const requestedIndex = Number.isFinite(index) ? Math.trunc(index) : baseDestination.length;
  const destinationIndex = Math.max(0, Math.min(requestedIndex, baseDestination.length));

  if (isSameParent && destinationIndex === sourceIndex) return state;

  const nextDestination = [...baseDestination];
  nextDestination.splice(destinationIndex, 0, id);
  const now = Date.now();
  const pages = { ...state.pages };
  let rootOrder = state.rootOrder;

  if (previousParentId) {
    pages[previousParentId] = {
      ...pages[previousParentId],
      childrenIds: isSameParent ? nextDestination : sourceWithoutPage,
      updatedAt: now,
    };
  } else {
    rootOrder = isSameParent ? nextDestination : sourceWithoutPage;
  }

  if (parentId) {
    pages[parentId] = {
      ...pages[parentId],
      childrenIds: nextDestination,
      updatedAt: now,
    };
  } else {
    rootOrder = nextDestination;
  }

  pages[id] = { ...page, parentId };
  return { ...state, pages, rootOrder };
}

export function collectDescendants(state: KnowledgeOSState, id: string): string[] {
  const out: string[] = [];
  const walk = (pid: string) => {
    const page = state.pages[pid];
    if (!page) return;
    out.push(pid);
    page.childrenIds.forEach(walk);
  };
  walk(id);
  return out;
}

export function deletePageAndDescendants(state: KnowledgeOSState, id: string): KnowledgeOSState {
  const doomed = new Set(collectDescendants(state, id));
  const target = state.pages[id];
  const pages: Record<string, KnowledgePage> = {};

  for (const [pid, page] of Object.entries(state.pages)) {
    if (doomed.has(pid)) continue;
    pages[pid] = page;
  }

  if (target?.parentId && pages[target.parentId]) {
    pages[target.parentId] = {
      ...pages[target.parentId],
      childrenIds: pages[target.parentId].childrenIds.filter((c) => c !== id),
    };
  }

  const rootOrder = state.rootOrder.filter((r) => !doomed.has(r));
  const activePageId =
    state.activePageId && doomed.has(state.activePageId)
      ? (rootOrder[0] ?? null)
      : state.activePageId;

  return { pages, rootOrder, activePageId };
}

export function getAncestors(state: KnowledgeOSState, id: string): KnowledgePage[] {
  const trail: KnowledgePage[] = [];
  let current = state.pages[id];
  while (current) {
    trail.unshift(current);
    current = current.parentId ? state.pages[current.parentId] : (undefined as never);
  }
  return trail;
}

export function countBlocks(content: JSONContent): number {
  if (!content || !Array.isArray(content.content)) return 0;
  return content.content.length;
}

export function seedState(): KnowledgeOSState {
  const page = createPage(null);
  page.title = "Welcome to Knowledge OS";
  page.content = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Capture first. Organise never." }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hit " },
          { type: "text", marks: [{ type: "code" }], text: "/" },
          {
            type: "text",
            text: " anywhere on this canvas to summon blocks — headings, lists, to-dos, code, quotes. Select text for the floating format bar.",
          },
        ],
      },
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: true },
            content: [{ type: "paragraph", content: [{ type: "text", text: "Open the engine" }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Drop a cover image from your machine" }],
              },
            ],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Write the thought down" }] },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "Everything is local" }],
      },
      {
        type: "codeBlock",
        attrs: { language: "typescript" },
        content: [
          {
            type: "text",
            text: 'const state = load("knowledge-os-state");\n// pages, rootOrder, activePageId — persisted on every keystroke.',
          },
        ],
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Zero friction between having a thought and capturing it.",
              },
            ],
          },
        ],
      },
    ],
  };

  return { pages: { [page.id]: page }, rootOrder: [page.id], activePageId: page.id };
}
