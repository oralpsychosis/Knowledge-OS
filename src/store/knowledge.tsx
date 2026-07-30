import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { JSONContent, KnowledgeOSState, KnowledgePage } from "@/lib/types";
import { loadState, saveStateDebounced } from "@/lib/storage";
import { addPage, deletePageAndDescendants, seedState } from "@/lib/pages";
import { useAuth } from "@/lib/auth-context";

type Action =
  | { type: "hydrate"; state: KnowledgeOSState }
  | { type: "select"; id: string | null }
  | { type: "add"; parentId: string | null }
  | { type: "addWithContent"; parentId: string | null; title: string; content: JSONContent }
  | { type: "delete"; id: string }
  | { type: "patch"; id: string; patch: Partial<KnowledgePage> }
  | { type: "setContent"; id: string; content: JSONContent };

const initialState: KnowledgeOSState = { pages: {}, rootOrder: [], activePageId: null };

function reducer(state: KnowledgeOSState, action: Action): KnowledgeOSState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "select":
      return { ...state, activePageId: action.id };
    case "add":
      return addPage(state, action.parentId);
    case "addWithContent": {
      let s = addPage(state, action.parentId);
      const id = s.activePageId;
      if (id && s.pages[id]) {
        s = {
          ...s,
          pages: {
            ...s.pages,
            [id]: { ...s.pages[id], title: action.title, content: action.content, updatedAt: Date.now() },
          },
        };
      }
      return s;
    }
    case "delete":
      return deletePageAndDescendants(state, action.id);
    case "patch": {
      const page = state.pages[action.id];
      if (!page) return state;
      return {
        ...state,
        pages: {
          ...state.pages,
          [action.id]: { ...page, ...action.patch, updatedAt: Date.now() },
        },
      };
    }
    case "setContent": {
      const page = state.pages[action.id];
      if (!page) return state;
      return {
        ...state,
        pages: {
          ...state.pages,
          [action.id]: { ...page, content: action.content, updatedAt: Date.now() },
        },
      };
    }
    default:
      return state;
  }
}

interface Ctx {
  state: KnowledgeOSState;
  ready: boolean;
  activePage: KnowledgePage | null;
  select: (id: string | null) => void;
  addPage: (parentId?: string | null) => void;
  addPageWithContent: (parentId: string | null, title: string, content: JSONContent) => void;
  deletePage: (id: string) => void;
  patchPage: (id: string, patch: Partial<KnowledgePage>) => void;
  setContent: (id: string, content: JSONContent) => void;
}

const KnowledgeContext = createContext<Ctx | null>(null);

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const ready = useRef(false);
  const [, force] = useReducer((n: number) => n + 1, 0);
  const auth = useAuth();
  const lastSavedRef = useRef("");

  useEffect(() => {
    (async () => {
      // Try remote first if logged in, fall back to local
      const remote = auth.user ? await auth.fetchRemote() : null;
      const loaded = remote ?? (await loadState()) ?? seedState();
      dispatch({ type: "hydrate", state: loaded });
      ready.current = true;
      force();
    })();
  }, [auth.user]);

  useEffect(() => {
    if (!ready.current) return;
    saveStateDebounced(state);
    // Also sync to Supabase when user is authenticated
    if (auth.user) {
      const json = JSON.stringify(state);
      if (json !== lastSavedRef.current) {
        lastSavedRef.current = json;
        auth.syncToRemote(state);
      }
    }
  }, [state, auth.user]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready: ready.current,
      activePage: state.activePageId ? (state.pages[state.activePageId] ?? null) : null,
      select: (id) => dispatch({ type: "select", id }),
      addPage: (parentId = null) => dispatch({ type: "add", parentId }),
      addPageWithContent: (parentId, title, content) => dispatch({ type: "addWithContent", parentId, title, content }),
      deletePage: (id) => dispatch({ type: "delete", id }),
      patchPage: (id, patch) => dispatch({ type: "patch", id, patch }),
      setContent: (id, content) => dispatch({ type: "setContent", id, content }),
    }),
    [state],
  );

  return <KnowledgeContext.Provider value={value}>{children}</KnowledgeContext.Provider>;
}

export function useKnowledge(): Ctx {
  const ctx = useContext(KnowledgeContext);
  if (!ctx) throw new Error("useKnowledge must be used inside KnowledgeProvider");
  return ctx;
}
