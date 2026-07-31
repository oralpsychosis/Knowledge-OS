import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  JSONContent,
  KnowledgeOSState,
  KnowledgePage,
  PageKind,
  WhiteboardScene,
} from "@/lib/types";
import { loadState, saveStateDebounced } from "@/lib/storage";
import { addPage, deletePageAndDescendants, movePage, seedState } from "@/lib/pages";
import { useAuth } from "@/lib/auth-context";
import { subscribeToRemoteChanges } from "@/lib/supabase";

type Action =
  | { type: "hydrate"; state: KnowledgeOSState }
  | { type: "select"; id: string | null }
  | { type: "add"; parentId: string | null; kind: PageKind }
  | { type: "addWithContent"; parentId: string | null; title: string; content: JSONContent }
  | { type: "delete"; id: string }
  | { type: "move"; id: string; parentId: string | null; index: number }
  | { type: "patch"; id: string; patch: Partial<KnowledgePage> }
  | { type: "setContent"; id: string; content: JSONContent }
  | { type: "setWhiteboard"; id: string; whiteboard: WhiteboardScene };

const initialState: KnowledgeOSState = { pages: {}, rootOrder: [], activePageId: null };

function reducer(state: KnowledgeOSState, action: Action): KnowledgeOSState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "select":
      return { ...state, activePageId: action.id };
    case "add":
      return addPage(state, action.parentId, action.kind);
    case "addWithContent": {
      let s = addPage(state, action.parentId);
      const id = s.activePageId;
      if (id && s.pages[id]) {
        s = {
          ...s,
          pages: {
            ...s.pages,
            [id]: {
              ...s.pages[id],
              title: action.title,
              content: action.content,
              updatedAt: Date.now(),
            },
          },
        };
      }
      return s;
    }
    case "delete":
      return deletePageAndDescendants(state, action.id);
    case "move":
      return movePage(state, action.id, action.parentId, action.index);
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
    case "setWhiteboard": {
      const page = state.pages[action.id];
      if (!page || page.kind !== "whiteboard") return state;
      return {
        ...state,
        pages: {
          ...state.pages,
          [action.id]: {
            ...page,
            whiteboard: action.whiteboard,
            updatedAt: Date.now(),
          },
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
  syncing: boolean;
  activePage: KnowledgePage | null;
  select: (id: string | null) => void;
  addPage: (parentId?: string | null, kind?: PageKind) => void;
  addWhiteboard: (parentId?: string | null) => void;
  addPageWithContent: (parentId: string | null, title: string, content: JSONContent) => void;
  deletePage: (id: string) => void;
  movePage: (id: string, parentId: string | null, index: number) => void;
  patchPage: (id: string, patch: Partial<KnowledgePage>) => void;
  setContent: (id: string, content: JSONContent) => void;
  setWhiteboard: (id: string, whiteboard: WhiteboardScene) => void;
}

const KnowledgeContext = createContext<Ctx | null>(null);

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const auth = useAuth();

  const lastSavedRef = useRef("");
  const remoteVersionRef = useRef("");

  useEffect(() => {
    if (auth.loading) return;

    let active = true;
    const init = async () => {
      setReady(false);
      let loaded: KnowledgeOSState | null = null;

      if (auth.user) {
        loaded = await auth.fetchRemote();
        if (!loaded) {
          const local = await loadState();
          loaded = local ?? seedState();
          await auth.syncToRemote(loaded);
        }
      } else {
        loaded = await loadState();
        if (!loaded) loaded = seedState();
      }

      if (active) {
        dispatch({ type: "hydrate", state: loaded });
        const json = JSON.stringify(loaded);
        lastSavedRef.current = json;
        remoteVersionRef.current = json;
        setReady(true);
      }
    };

    init();
    return () => {
      active = false;
    };
  }, [auth.user, auth.loading]);

  useEffect(() => {
    if (!auth.user || !ready) return;

    const unsub = subscribeToRemoteChanges(auth.user.id, (newState) => {
      const json = JSON.stringify(newState);
      if (json !== lastSavedRef.current && json !== remoteVersionRef.current) {
        dispatch({ type: "hydrate", state: newState });
        remoteVersionRef.current = json;
      }
    });

    return unsub;
  }, [auth.user, ready]);

  useEffect(() => {
    if (!ready) return;
    const json = JSON.stringify(state);
    saveStateDebounced(state);

    if (auth.user && json !== lastSavedRef.current) {
      setSyncing(true);
      const timer = setTimeout(async () => {
        try {
          await auth.syncToRemote(state);
          lastSavedRef.current = JSON.stringify(state);
          setSyncing(false);
        } catch (err) {
          setSyncing(false);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state, auth.user, ready]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
      syncing,
      activePage: state.activePageId ? (state.pages[state.activePageId] ?? null) : null,
      select: (id) => dispatch({ type: "select", id }),
      addPage: (parentId = null, kind = "document") => dispatch({ type: "add", parentId, kind }),
      addWhiteboard: (parentId = null) => dispatch({ type: "add", parentId, kind: "whiteboard" }),
      addPageWithContent: (parentId, title, content) =>
        dispatch({ type: "addWithContent", parentId, title, content }),
      deletePage: (id) => dispatch({ type: "delete", id }),
      movePage: (id, parentId, index) => dispatch({ type: "move", id, parentId, index }),
      patchPage: (id, patch) => dispatch({ type: "patch", id, patch }),
      setContent: (id, content) => dispatch({ type: "setContent", id, content }),
      setWhiteboard: (id, whiteboard) => dispatch({ type: "setWhiteboard", id, whiteboard }),
    }),
    [state, ready, syncing],
  );

  return <KnowledgeContext.Provider value={value}>{children}</KnowledgeContext.Provider>;
}

export function useKnowledge(): Ctx {
  const ctx = useContext(KnowledgeContext);
  if (!ctx) throw new Error("useKnowledge must be used inside KnowledgeProvider");
  return ctx;
}
