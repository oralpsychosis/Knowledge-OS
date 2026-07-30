import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, signInWithGoogle, signOut, onAuthChange, fetchRemoteState, upsertRemoteState } from "./supabase";
import type { KnowledgeOSState } from "./types";

interface AuthCtx {
  user: import("@supabase/supabase-js").User | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
  syncToRemote: (state: KnowledgeOSState) => void;
  fetchRemote: () => Promise<KnowledgeOSState | null>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value: AuthCtx = {
    user,
    loading,
    signIn: () => { signInWithGoogle(); },
    signOut: () => { signOut(); },
    syncToRemote: (state) => {
      if (user) upsertRemoteState(user.id, state);
    },
    fetchRemote: () => {
      if (!user) return Promise.resolve(null);
      return fetchRemoteState(user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
