import { createClient } from "@supabase/supabase-js";
import type { KnowledgeOSState } from "./types";

// Dynamic env reading with safety catch
const getEnv = (name: string): string | undefined => {
  try {
    return import.meta.env[name];
  } catch {
    return undefined;
  }
};

const url = getEnv("VITE_SUPABASE_URL");
const key = getEnv("VITE_SUPABASE_ANON_KEY");

// Robust browser detection
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";

// Only attempt to initialize if we have credentials AND we are in the browser.
// Supabase client can sometimes attempt to access localStorage during 
// initialization if not explicitly told how to handle storage.
const canInitialize = Boolean(
  isBrowser &&
  url && 
  key && 
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
  if (!supabase || !isBrowser) return;
  try {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account', access_type: 'offline' },
      },
    });
  } catch (err) {
    console.error("Sign in failed:", err);
  }
}

export async function signOut() {
  if (!supabase || !isBrowser) return;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Sign out failed:", err);
  }
}

/**
 * Monitors authentication state. Immediately signals a null user on the server
 * or if unconfigured so that the hydration process can complete.
 */
export function onAuthChange(cb: (user: any | null) => void) {
  if (!supabase || !isBrowser) {
    // Immediate callback to allow AuthProvider to stop loading
    setTimeout(() => cb(null), 0);
    return () => {};
  }
  
  try {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(session?.user ?? null);
    });
    
    // Check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      cb(session?.user ?? null);
    }).catch(() => cb(null));
    
    return () => {
      if (data?.subscription) data.subscription.unsubscribe();
    };
  } catch (err) {
    console.error("Auth listener failed:", err);
    cb(null);
    return () => {};
  }
}

/* ------------------------------------------------------------------ */
/*  Document sync                                                      */
/* ------------------------------------------------------------------ */

const TABLE = "documents";

export async function fetchRemoteState(userId: string): Promise<KnowledgeOSState | null> {
  if (!supabase || !isBrowser) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("content")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) throw error;
    return (data?.content as KnowledgeOSState) || null;
  } catch (err) {
    console.warn("Remote fetch failed:", err);
    return null;
  }
}

export async function upsertRemoteState(userId: string, state: KnowledgeOSState) {
  if (!supabase || !isBrowser) return;
  try {
    const { error } = await supabase.from(TABLE).upsert(
      { user_id: userId, content: state, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (error) throw error;
  } catch (err) {
    console.warn("Remote sync failed:", err);
  }
}

export function subscribeToRemoteChanges(userId: string, onUpdate: (state: KnowledgeOSState) => void) {
  if (!supabase || !isBrowser) return () => {};
  
  try {
    const channel = supabase
      .channel(`sync:${userId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: TABLE, 
        filter: `user_id=eq.${userId}` 
      }, 
      (payload) => {
        const next = (payload.new as any)?.content;
        if (next) onUpdate(next as KnowledgeOSState);
      }
    )
    .subscribe();

    return () => { 
      if (channel) supabase.removeChannel(channel); 
    };
  } catch (err) {
    console.error("Remote subscription failed:", err);
    return () => {};
  }
}