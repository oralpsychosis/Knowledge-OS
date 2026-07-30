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
  await supabase.auth.signInWithOAuth({ provider: "google" });
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

const TABLE = "documents";

export async function fetchRemoteState(userId: string): Promise<KnowledgeOSState | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from(TABLE)
      .select("state")
      .eq("user_id", userId)
      .single();
    if (data?.state) return data.state as KnowledgeOSState;
    return null;
  } catch {
    return null;
  }
}

export async function upsertRemoteState(userId: string, state: KnowledgeOSState) {
  if (!supabase) return;
  try {
    await supabase.from(TABLE).upsert(
      { user_id: userId, state, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  } catch {
    /* sync failure — silent */
  }
}
