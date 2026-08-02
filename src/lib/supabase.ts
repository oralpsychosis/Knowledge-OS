import { createClient } from "@supabase/supabase-js";
import type { KnowledgeOSState } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const canInitialize = Boolean(
  url && 
  key && 
  typeof url === "string" && 
  url.startsWith("http") &&
  !url.includes("YOUR_SUPABASE_URL")
);

// Critical fix: prevent Supabase from attempting to access localStorage on the server
const isServer = typeof window === "undefined";

export const supabase = canInitialize 
  ? createClient(url!, key!, {
      auth: {
        persistSession: !isServer, // Only persist on client
        autoRefreshToken: !isServer,
        detectSessionInUrl: !isServer,
      }
    }) 
  : null;

/* ------------------------------------------------------------------ */
/*  Auth helpers                                                       */
/* ------------------------------------------------------------------ */

export async function signInWithGoogle() {
  if (!supabase || isServer) return;
  
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    });
    if (error) throw error;
  } catch (err) {
    console.error("Sign in failed:", err);
  }
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Monitors authentication state. If Supabase is not configured or fails,
 * it immediately signals a null user so the app can finish hydrating.
 */
export function onAuthChange(cb: (user: import("@supabase/supabase-js").User | null) => void) {
  if (!supabase) {
    cb(null);
    return () => {};
  }
  
  // Setup listener
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  
  // Check current session immediately (async but safe)
  supabase.auth.getSession()
    .then(({ data: { session } }) => {
      cb(session?.user ?? null);
    })
    .catch((err) => {
      console.warn("Supabase session check failed:", err.message);
      cb(null);
    });
  
  return () => data?.subscription.unsubscribe();
}

/* ------------------------------------------------------------------ */
/*  Document sync                                                      */
/* ------------------------------------------------------------------ */

const TABLE = "documents";

export async function fetchRemoteState(userId: string): Promise<KnowledgeOSState | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("content")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) {
      console.warn("Remote state fetch note:", error.message);
      return null;
    }
    return (data?.content as KnowledgeOSState) || null;
  } catch (err) {
    console.error("Failed to fetch remote state:", err);
    return null;
  }
}

export async function upsertRemoteState(userId: string, state: KnowledgeOSState) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from(TABLE).upsert(
      { 
        user_id: userId, 
        content: state, 
        updated_at: new Date().toISOString() 
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
  } catch (err) {
    console.error("Remote sync failed:", err);
  }
}

export function subscribeToRemoteChanges(userId: string, onUpdate: (state: KnowledgeOSState) => void) {
  if (!supabase || isServer) return () => {};
  
  try {
    const channel = supabase
      .channel(`sync:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = (payload.new as any)?.content;
          if (next) onUpdate(next as KnowledgeOSState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.error("Subscription failed:", err);
    return () => {};
  }
}