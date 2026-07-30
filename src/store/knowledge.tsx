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

  // Hydration logic
  useEffect(() => {
    let active = true;
    const init = async () => {
      setReady(false);
      
      // Try remote first if logged in
      const remote = auth.user ? await auth.fetchRemote() : null;
      if (!active) return;

      const loaded = remote ?? (await loadState()) ?? seedState();
      dispatch({ type: "hydrate", state: loaded });
      
      if (remote) {
        remoteVersionRef.current = JSON.stringify(remote);
      }
      
      setReady(true);
    };
    init();
    return () => { active = false; };
  }, [auth.user]);

  // Real-time subscription
  useEffect(() => {
    if (!auth.user || !ready) return;

    const unsub = subscribeToRemoteChanges(auth.user.id, (newState) => {
      const json = JSON.stringify(newState);
      // Only hydrate if the remote version is different from what we last saved
      // to avoid infinite loops or clobbering active edits
      if (json !== lastSavedRef.current && json !== remoteVersionRef.current) {
        dispatch({ type: "hydrate", state: newState });
        remoteVersionRef.current = json;
      }
    });

    return unsub;
  }, [auth.user, ready]);

  // Persistence logic
  useEffect(() => {
    if (!ready) return;
    
    // Always save locally
    saveStateDebounced(state);

    // Sync to remote if authenticated
    if (auth.user) {
      const json = JSON.stringify(state);
      if (json !== lastSavedRef.current) {
        lastSavedRef.current = json;
        setSyncing(true);
        
        const performSync = async () => {
          try {
            await auth.syncToRemote(state);
            setSyncing(false);
          } catch (err) {
            setSyncing(false);
            toast.error("Sync failed. Checking connection...");
          }
        };
        
        // Debounce remote sync slightly more than local
        const timer = setTimeout(performSync, 800);
        return () => clearTimeout(timer);
      }
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