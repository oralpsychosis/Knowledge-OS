import type { KnowledgeOSState } from "./types";

const DB_NAME = "knowledge-os";
const DB_VERSION = 1;
const STORE_NAME = "state";
const LS_KEY = "knowledge-os-state";

// ---------------------------------------------------------------------------
// IndexedDB — persists the full state including data-URL images (no size limit)
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

async function dbPut(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    /* private mode or blocked — ignore */
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function loadState(): Promise<KnowledgeOSState | null> {
  if (typeof window === "undefined") return null;

  // 1. Primary: IndexedDB (handles large image data URLs)
  const fromDB = await dbGet<string>(LS_KEY);
  if (fromDB) {
    try {
      const parsed = JSON.parse(fromDB) as KnowledgeOSState;
      if (parsed && typeof parsed === "object" && parsed.pages) return parsed;
    } catch { /* corrupt — fall through */ }
  }

  // 2. Fallback: localStorage (legacy data or backup)
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KnowledgeOSState;
    if (parsed && typeof parsed === "object" && parsed.pages) {
      // Migrate legacy data to IndexedDB
      dbPut(LS_KEY, raw);
      return parsed;
    }
  } catch { /* ignore */ }

  return null;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export function saveStateDebounced(state: KnowledgeOSState, delay = 400) {
  if (typeof window === "undefined") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => saveStateNow(state), delay);
}

/**
 * Save to both IndexedDB (primary) and localStorage (compact backup).
 * The IndexedDB copy includes full data URLs for images.
 */
export async function saveStateNow(state: KnowledgeOSState) {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(state);

  // Primary: IndexedDB — holds everything including large image data URLs
  await dbPut(LS_KEY, json);

  // Secondary: localStorage — best-effort mirror (may fail if images are too large)
  try {
    localStorage.setItem(LS_KEY, json);
  } catch {
    /* quota exceeded for large images — IndexedDB copy still exists */
  }
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
