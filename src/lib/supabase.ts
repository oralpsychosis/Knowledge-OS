import { createClient } from "@supabase/supabase-js";
import type { KnowledgeOSState } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && key ? createClient(url, key) : null;

/* ------------------------------------------------------------------ */
/*  Auth helpers                                                       */
/* ------------------------------------------------------------------ */

export async function signInWithGoogle() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: 'select_account',
        access_type: 'offline',
      },
    },
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function onAuthChange(cb: (user: import("@supabase/supabase-js").User | null) => void) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  // Check current session
  supabase.auth.getSession().then(({ data: { session } }) => {
    cb(session?.user ?? null);
  });
  return () => data?.subscription.unsubscribe();
}

/* ------------------------------------------------------------------ */
/*  Document sync                                                      */
/* ------------------------------------------------------------------ */

// The table uses user_id (uuid, unique), content (jsonb), and updated_at (timestamptz)
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
      console.error("Supabase fetch error:", error);
      return null;
    }
    if (data?.content) return data.content as KnowledgeOSState;
    return null;
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
    console.error("Failed to sync to remote:", err);
    throw err;
  }
}

export function subscribeToRemoteChanges(userId: string, onUpdate: (state: KnowledgeOSState) => void) {
  if (!supabase) return () => {};
  
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
        if (payload.new && (payload.new as any).content) {
          onUpdate((payload.new as any).content as KnowledgeOSState);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}