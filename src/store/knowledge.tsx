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
import type { JSONContent, KnowledgeOSState, KnowledgePage } from "@/lib/types";
import { loadState, saveStateDebounced } from "@/lib/storage";
import { addPage, deletePageAndDescendants, seedState } from "@/lib/pages";
import { useAuth } from "@/lib/auth-context";
import { subscribeToRemoteChanges } from "@/lib/supabase";
import { toast } from "sonner";

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
  syncing: boolean;
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
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const auth = useAuth();
  
  const lastSavedRef = useRef("");
  const remoteVersionRef = useRef("");

  // 1. Initial Load & Auth Change
  useEffect(() => {
    if (auth.loading) return;

    let active = true;
    const init = async () => {
      setReady(false);
      
      let loaded: KnowledgeOSState | null = null;

      if (auth.user) {
        // AUTHENTICATED: Cloud is primary
        loaded = await auth.fetchRemote();
        if (loaded) {
          toast.success("Cloud workspace loaded");
        } else {
          // New user: try to migrate existing local state or start fresh
          const local = await loadState();
          loaded = local ?? seedState();
          await auth.syncToRemote(loaded);
          toast.info("Started cloud sync for your workspace");
        }
      } else {
        // GUEST: Local is primary
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
    return () => { active = false; };
  }, [auth.user, auth.loading]);

  // 2. Real-time Subscription
  useEffect(() => {
    if (!auth.user || !ready) return;

    const unsub = subscribeToRemoteChanges(auth.user.id, (newState) => {
      const json = JSON.stringify(newState);
      // Only hydrate if the update is truly new and not our own recent save
      if (json !== lastSavedRef.current && json !== remoteVersionRef.current) {
        dispatch({ type: "hydrate", state: newState });
        remoteVersionRef.current = json;
        toast.info("Remote changes synced");
      }
    });

    return unsub;
  }, [auth.user, ready]);

  // 3. Auto-save Persistence
  useEffect(() => {
    if (!ready) return;
    
    const json = JSON.stringify(state);

    // Maintain local mirror as a performance cache/offline copy
    saveStateDebounced(state);

    // Sync to Supabase if authenticated and changes detected
    if (auth.user && json !== lastSavedRef.current) {
      setSyncing(true);
      
      const performSync = async () => {
        try {
          await auth.syncToRemote(state);
          lastSavedRef.current = JSON.stringify(state);
          setSyncing(false);
        } catch (err) {
          setSyncing(false);
          console.error("Cloud sync failed:", err);
        }
      };
      
      // Debounce the cloud sync to avoid hitting rate limits
      const timer = setTimeout(performSync, 800);
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
      addPage: (parentId = null) => dispatch({ type: "add", parentId }),
      addPageWithContent: (parentId, title, content) => dispatch({ type: "addWithContent", parentId, title, content }),
      deletePage: (id) => dispatch({ type: "delete", id }),
      patchPage: (id, patch) => dispatch({ type: "patch", id, patch }),
      setContent: (id, content) => dispatch({ type: "setContent", id, content }),
    }),
    [state, ready, syncing]
  );

  return <KnowledgeContext.Provider value={value}>{children}</KnowledgeContext.Provider>;
}

export function useKnowledge(): Ctx {
  const ctx = useContext(KnowledgeContext);
  if (!ctx) throw new Error("useKnowledge must be used inside KnowledgeProvider");
  return ctx;
}