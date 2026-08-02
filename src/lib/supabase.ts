import { createClient } from "@supabase/supabase-js";
import type { KnowledgeOSState } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isServer = typeof window === "undefined";

const canInitialize = Boolean(
  url && 
  key && 
  !isServer && // Aggressively disable on server
  url.startsWith("http") &&
  !url.includes("YOUR_SUPABASE_URL")
);

export const supabase = canInitialize 
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    }) 
  : null;

/* ------------------------------------------------------------------ */
/*  Auth helpers                                                       */
/* ------------------------------------------------------------------ */

export async function signInWithGoogle() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: 'select_account', access_type: 'offline' },
    },
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Monitors authentication state. Immediately signals a null user on the server
 * so that the hydration process can complete without waiting for a database response.
 */
export function onAuthChange(cb: (user: any | null) => void) {
  if (!supabase || isServer) {
    cb(null);
    return () => {};
  }
  
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  
  supabase.auth.getSession().then(({ data: { session } }) => {
    cb(session?.user ?? null);
  }).catch(() => cb(null));
  
  return () => data?.subscription.unsubscribe();
}

/* ------------------------------------------------------------------ */
/*  Document sync                                                      */
/* ------------------------------------------------------------------ */

const TABLE = "documents";

export async function fetchRemoteState(userId: string): Promise<KnowledgeOSState | null> {
  if (!supabase || isServer) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("content")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) return null;
    return (data?.content as KnowledgeOSState) || null;
  } catch {
    return null;
  }
}

export async function upsertRemoteState(userId: string, state: KnowledgeOSState) {
  if (!supabase || isServer) return;
  try {
    await supabase.from(TABLE).upsert(
      { user_id: userId, content: state, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  } catch (err) {
    console.error("Remote sync failed:", err);
  }
}

export function subscribeToRemoteChanges(userId: string, onUpdate: (state: KnowledgeOSState) => void) {
  if (!supabase || isServer) return () => {};
  
  const channel = supabase
    .channel(`sync:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${userId}` }, 
      (payload) => {
        const next = (payload.new as any)?.content;
        if (next) onUpdate(next as KnowledgeOSState);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}