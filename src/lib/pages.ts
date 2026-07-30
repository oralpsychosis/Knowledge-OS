import type { JSONContent, KnowledgeOSState, KnowledgePage } from "./types";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function emptyDoc(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function createPage(parentId: string | null = null): KnowledgePage {
  const now = Date.now();
  return {
    id: uid(),
    title: "",
    parentId,
    childrenIds: [],
    content: emptyDoc(),
    createdAt: now,
    updatedAt: now,
  };
}

export function addPage(state: KnowledgeOSState, parentId: string | null): KnowledgeOSState {
  const page = createPage(parentId);
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

export function deletePageAndDescendants(
  state: KnowledgeOSState,
  id: string,
): KnowledgeOSState {
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
