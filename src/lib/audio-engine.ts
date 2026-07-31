const PREFS_KEY = "focus-audio-prefs";
const SOUNDS_BASE = "/sounds/";
const DEFAULT_MASTER_VOLUME = 0.5;
const DEFAULT_LAYER_VOLUME = 0.8;

export interface TrackInfo {
  id: string;
  label: string;
  icon: string;
  file: string;
}

export interface AudioLayerPrefs {
  id: string;
  volume: number;
}

export interface AudioPrefs {
  version: 2;
  layers: AudioLayerPrefs[];
  masterVolume: number;
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
/*  Track discovery — pure data, safe for SSR                         */
/* ------------------------------------------------------------------ */

export function getAvailableTracks(): TrackInfo[] {
  return Object.entries(TRACK_MAP).map(([id, track]) => ({
    id,
    label: track.label,
    icon: track.icon,
    file: `${SOUNDS_BASE}${id}.ogg`,
  }));
}

export function createAudioLayer(id: string): AudioLayerPrefs {
  return { id, volume: DEFAULT_LAYER_VOLUME };
}

/* ------------------------------------------------------------------ */
/*  HTML5 <audio> manager — lazily initialized after user interaction */
/* ------------------------------------------------------------------ */

let audioElements: Map<string, HTMLAudioElement> | null = null;

function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function getAudioMap(): Map<string, HTMLAudioElement> {
  if (!audioElements) {
    audioElements = new Map();
  }
  return audioElements;
}

function getTrackMap(): Map<string, TrackInfo> {
  return new Map(getAvailableTracks().map((track) => [track.id, track]));
}

/**
 * Starts or updates a mix. This must only be called from a user gesture.
 * Returns whether at least one requested track successfully began playback.
 */
export async function playTracks(
  layers: AudioLayerPrefs[],
  masterVolume: number,
): Promise<boolean> {
  if (typeof window === "undefined" || layers.length === 0) return false;

  try {
    const map = getAudioMap();
    const tracksById = getTrackMap();
    const activeIds = new Set(layers.map((layer) => layer.id));
    const playback: Promise<void>[] = [];

    for (const [id, element] of map) {
      if (!activeIds.has(id)) element.pause();
    }

    for (const layer of layers) {
      const track = tracksById.get(layer.id);
      if (!track) continue;

      let element = map.get(track.id);
      if (!element) {
        element = new Audio(track.file);
        element.loop = true;
        element.preload = "none";
        map.set(track.id, element);
      }

      element.volume = clampVolume(masterVolume * layer.volume);
      playback.push(element.play());
    }

    const results = await Promise.allSettled(playback);
    return results.some((result) => result.status === "fulfilled");
  } catch {
    return false;
  }
}

export function pauseAll(): void {
  if (!audioElements) return;

  for (const element of audioElements.values()) {
    try {
      element.pause();
    } catch {
      // One broken source should not block the rest of the mix.
    }
  }
}

export function setMixVolumes(layers: AudioLayerPrefs[], masterVolume: number): void {
  if (!audioElements) return;

  const layerMap = new Map(layers.map((layer) => [layer.id, layer.volume]));
  for (const [id, element] of audioElements) {
    const layerVolume = layerMap.get(id);
    if (layerVolume === undefined) continue;

    try {
      element.volume = clampVolume(masterVolume * layerVolume);
    } catch {
      // Ignore an unavailable element and keep the other layers responsive.
    }
  }
}

export function disposeAll(): void {
  if (!audioElements) return;

  for (const element of audioElements.values()) {
    try {
      element.pause();
      element.currentTime = 0;
    } catch {
      // Continue disposing the remaining elements.
    }
  }

  audioElements.clear();
  audioElements = null;
}

/* ------------------------------------------------------------------ */
/*  Persistence — localStorage always wrapped in try/catch            */
/* ------------------------------------------------------------------ */

function defaultPrefs(): AudioPrefs {
  return {
    version: 2,
    layers: [],
    masterVolume: DEFAULT_MASTER_VOLUME,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeLayers(value: unknown): AudioLayerPrefs[] {
  if (!Array.isArray(value)) return [];

  const validIds = new Set(Object.keys(TRACK_MAP));
  const seenIds = new Set<string>();
  const layers: AudioLayerPrefs[] = [];

  for (const candidate of value) {
    if (!isRecord(candidate)) continue;

    const { id, volume } = candidate;
    if (
      typeof id !== "string" ||
      !validIds.has(id) ||
      seenIds.has(id) ||
      typeof volume !== "number" ||
      !Number.isFinite(volume)
    ) {
      continue;
    }

    seenIds.add(id);
    layers.push({ id, volume: clampVolume(volume) });
  }

  return layers;
}

function readCurrentPrefs(value: Record<string, unknown>): AudioPrefs | null {
  if (value.version !== 2 || !Array.isArray(value.layers)) return null;

  const masterVolume =
    typeof value.masterVolume === "number" && Number.isFinite(value.masterVolume)
      ? clampVolume(value.masterVolume)
      : DEFAULT_MASTER_VOLUME;

  return {
    version: 2,
    layers: normalizeLayers(value.layers),
    masterVolume,
  };
}

function migrateLegacyPrefs(value: Record<string, unknown>): AudioPrefs | null {
  if (!Array.isArray(value.activeTrackIds)) return null;

  const validIds = new Set(Object.keys(TRACK_MAP));
  const seenIds = new Set<string>();
  const layers: AudioLayerPrefs[] = [];

  for (const candidate of value.activeTrackIds) {
    if (typeof candidate !== "string" || !validIds.has(candidate) || seenIds.has(candidate)) {
      continue;
    }

    seenIds.add(candidate);
    // Legacy mixes applied one shared volume directly to every selected track.
    layers.push({ id: candidate, volume: 1 });
  }

  const masterVolume =
    typeof value.volume === "number" && Number.isFinite(value.volume)
      ? clampVolume(value.volume)
      : DEFAULT_MASTER_VOLUME;

  return { version: 2, layers, masterVolume };
}

export function loadPrefs(): AudioPrefs {
  if (typeof window === "undefined") return defaultPrefs();

  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs();

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return defaultPrefs();

    const current = readCurrentPrefs(parsed);
    if (current) return current;

    const migrated = migrateLegacyPrefs(parsed);
    if (migrated) {
      savePrefs(migrated);
      return migrated;
    }
  } catch {
    // Corrupt or unavailable storage should leave audio safely disabled.
  }

  return defaultPrefs();
}

export function savePrefs(prefs: AudioPrefs): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore quota and private-mode failures; the current mix still works.
  }
}
