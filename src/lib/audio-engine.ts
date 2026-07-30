const PREFS_KEY = "focus-audio-prefs";
const SOUNDS_BASE = "/sounds/";

export interface TrackInfo {
  id: string;
  label: string;
  icon: string;
  file: string;
}

export interface AudioPrefs {
  activeTrackIds: string[];
  volume: number;
  muted: boolean;
}

const TRACK_MAP: Record<string, { label: string; icon: string }> = {
  rain: { label: "Rain", icon: "🌧️" },
  "coffee-shop": { label: "Coffee Shop", icon: "☕" },
  fireplace: { label: "Fireplace", icon: "🪵" },
  waves: { label: "Waves", icon: "🌊" },
  birds: { label: "Birds", icon: "🐦" },
  "summer-night": { label: "Summer Night", icon: "🌙" },
  storm: { label: "Storm", icon: "⛈️" },
  stream: { label: "Stream", icon: "🏞️" },
  wind: { label: "Wind", icon: "💨" },
  "pink-noise": { label: "Pink Noise", icon: "🩷" },
  "white-noise": { label: "White Noise", icon: "⬜" },
  train: { label: "Train", icon: "🚂" },
  city: { label: "City", icon: "🏙️" },
  boat: { label: "Boat", icon: "⛵" },
};

/* ------------------------------------------------------------------ */
/*  Track discovery — pure data, safe for SSR                          */
/* ------------------------------------------------------------------ */

export function getAvailableTracks(): TrackInfo[] {
  return Object.keys(TRACK_MAP).map((id) => ({
    id,
    label: TRACK_MAP[id].label,
    icon: TRACK_MAP[id].icon,
    file: `${SOUNDS_BASE}${id}.ogg`,
  }));
}

/* ------------------------------------------------------------------ */
/*  HTML5 <audio> manager — lazily initialized, all ops in try/catch   */
/* ------------------------------------------------------------------ */

let audioElements: Map<string, HTMLAudioElement> | null = null;

function getAudioMap(): Map<string, HTMLAudioElement> {
  if (!audioElements) {
    audioElements = new Map();
  }
  return audioElements;
}

export function playTracks(trackIds: string[], volume: number) {
  if (typeof window === "undefined") return;
  try {
    const all = getAvailableTracks();
    const map = getAudioMap();
    for (const t of all) {
      try {
        let el = map.get(t.id);
        if (!el) {
          el = new Audio(t.file);
          el.loop = true;
          el.preload = "auto";
          el.volume = 0;
          map.set(t.id, el);
        }
        if (trackIds.includes(t.id)) {
          el.volume = volume;
          try { el.play(); } catch { /* autoplay blocked */ }
        } else {
          el.pause();
        }
      } catch { /* per-track error skip */ }
    }
  } catch { /* engine error skip */ }
}

export function stopAll() {
  if (!audioElements) return;
  try {
    for (const el of audioElements.values()) {
      try { el.pause(); el.currentTime = 0; } catch { /* skip */ }
    }
  } catch { /* skip */ }
}

export function setVolume(v: number) {
  if (!audioElements) return;
  try {
    for (const el of audioElements.values()) {
      try { el.volume = v; } catch { /* skip */ }
    }
  } catch { /* skip */ }
}

export function muteAll() {
  if (!audioElements) return;
  try {
    for (const el of audioElements.values()) {
      try { el.volume = 0; } catch { /* skip */ }
    }
  } catch { /* skip */ }
}

export function disposeAll() {
  stopAll();
  if (audioElements) {
    audioElements.clear();
    audioElements = null;
  }
}

/* ------------------------------------------------------------------ */
/*  Persistence — localStorage always wrapped in try/catch             */
/* ------------------------------------------------------------------ */

export function loadPrefs(): AudioPrefs {
  if (typeof window === "undefined") return { activeTrackIds: [], volume: 0.5, muted: false };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { activeTrackIds: [], volume: 0.5, muted: false };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.activeTrackIds)) {
      return parsed;
    }
    return { activeTrackIds: [], volume: 0.5, muted: false };
  } catch {
    return { activeTrackIds: [], volume: 0.5, muted: false };
  }
}

export function savePrefs(prefs: AudioPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch { /* quota or private mode */ }
}
