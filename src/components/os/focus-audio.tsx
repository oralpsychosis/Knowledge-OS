import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  Headphones,
  Pause,
  Play,
  Plus,
  SlidersHorizontal,
  Volume2,
  X,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  createAudioLayer,
  getAvailableTracks,
  loadPrefs,
  pauseAll,
  playTracks,
  savePrefs,
  setMixVolumes,
} from "@/lib/audio-engine";
import type { AudioPrefs, TrackInfo } from "@/lib/audio-engine";

const tracks = getAvailableTracks();
const emptyPrefs: AudioPrefs = { version: 2, layers: [], masterVolume: 0.5 };
type PlaybackState = "paused" | "starting" | "playing";

export function FocusAudio({ collapsed = false }: { collapsed?: boolean }) {
  const [prefs, setPrefs] = useState<AudioPrefs>(emptyPrefs);
  const [open, setOpen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("paused");
  const playbackRequest = useRef(0);
  const playbackIntent = useRef(false);

  const activeTracks = useMemo(
    () =>
      prefs.layers
        .map((layer) => tracks.find((track) => track.id === layer.id))
        .filter((track): track is TrackInfo => track !== undefined),
    [prefs.layers],
  );
  const availableTracks = useMemo(
    () => tracks.filter((track) => !prefs.layers.some((layer) => layer.id === track.id)),
    [prefs.layers],
  );
  const hasMix = prefs.layers.length > 0;
  const mixLabel = getMixLabel(activeTracks);
  const playbackActive = playbackState !== "paused";

  useEffect(() => {
    const stored = loadPrefs();
    setPrefs(stored);

    return () => {
      playbackIntent.current = false;
      playbackRequest.current += 1;
      pauseAll();
    };
  }, []);

  function persist(next: AudioPrefs): void {
    setPrefs(next);
    savePrefs(next);
  }

  async function startMix(nextPrefs = prefs): Promise<void> {
    if (nextPrefs.layers.length === 0) return;
    playbackIntent.current = true;
    setPlaybackState("starting");
    const requestId = ++playbackRequest.current;
    const started = await playTracks(nextPrefs.layers, nextPrefs.masterVolume);
    if (playbackRequest.current !== requestId) return;
    if (!playbackIntent.current) {
      pauseAll();
      return;
    }

    playbackIntent.current = started;
    setPlaybackState(started ? "playing" : "paused");
  }

  function pauseMix(): void {
    playbackIntent.current = false;
    playbackRequest.current += 1;
    pauseAll();
    setPlaybackState("paused");
  }

  function togglePlayback(): void {
    if (playbackIntent.current) {
      pauseMix();
      return;
    }

    if (!hasMix) {
      setOpen(true);
      setShowLibrary(true);
      return;
    }

    void startMix();
  }

  function toggleMixer(): void {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !hasMix) setShowLibrary(true);
  }

  function addTrack(id: string): void {
    const next: AudioPrefs = {
      ...prefs,
      layers: [...prefs.layers, createAudioLayer(id)],
    };
    persist(next);
    if (playbackIntent.current) void startMix(next);
    if (next.layers.length === tracks.length) setShowLibrary(false);
  }

  function removeTrack(id: string): void {
    const next: AudioPrefs = {
      ...prefs,
      layers: prefs.layers.filter((layer) => layer.id !== id),
    };
    persist(next);

    if (next.layers.length === 0) {
      pauseMix();
      setShowLibrary(true);
    } else if (playbackIntent.current) {
      void startMix(next);
    }
  }

  function updateMasterVolume(values: number[]): void {
    const masterVolume = values[0] ?? prefs.masterVolume;
    const next = { ...prefs, masterVolume };
    persist(next);
    setMixVolumes(next.layers, next.masterVolume);
  }

  function updateLayerVolume(id: string, values: number[]): void {
    const volume = values[0];
    if (volume === undefined) return;

    const next = {
      ...prefs,
      layers: prefs.layers.map((layer) => (layer.id === id ? { ...layer, volume } : layer)),
    };
    persist(next);
    setMixVolumes(next.layers, next.masterVolume);
  }

  if (collapsed) {
    if (!hasMix) return null;

    return (
      <button
        type="button"
        onClick={togglePlayback}
        title={playbackActive ? `Pause ${mixLabel}` : `Resume ${mixLabel}`}
        aria-label={playbackActive ? `Pause ${mixLabel}` : `Resume ${mixLabel}`}
        className="flex h-10 w-full items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
      >
        {playbackActive ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d12]">
      <div className="flex h-10 items-center gap-2 px-2">
        <button
          type="button"
          onClick={toggleMixer}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
        >
          <Headphones
            className={`size-4 shrink-0 ${playbackActive ? "text-violet-300" : "text-white/40"}`}
          />
          <span className="min-w-0 flex-1 leading-none">
            <span className="block text-[12px] font-medium text-white/75">Soundscape</span>
            <span className="mt-1 block truncate text-[10px] text-white/35">
              {hasMix
                ? `${mixLabel} · ${
                    playbackState === "starting"
                      ? "Starting"
                      : playbackState === "playing"
                        ? "Playing"
                        : "Paused"
                  }`
                : "Off"}
            </span>
          </span>
        </button>

        {hasMix && (
          <button
            type="button"
            onClick={togglePlayback}
            title={playbackActive ? "Pause soundscape" : "Play soundscape"}
            aria-label={playbackActive ? "Pause soundscape" : "Play soundscape"}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            {playbackActive ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
        )}

        <button
          type="button"
          onClick={toggleMixer}
          title={open ? "Close soundscape mixer" : "Open soundscape mixer"}
          aria-label={open ? "Close soundscape mixer" : "Open soundscape mixer"}
          aria-expanded={open}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
        >
          <SlidersHorizontal className="size-3.5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden border-t border-white/[0.07]"
          >
            <div className="flex max-h-[min(200px,32dvh)] flex-col bg-[#111116] md:max-h-[min(260px,42vh)] [@media(max-height:520px)]:max-h-[min(170px,34dvh)]">
              {hasMix && (
                <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
                  <Volume2 className="size-3.5 shrink-0 text-white/35" />
                  <span className="w-10 text-[10px] font-medium text-white/45">Master</span>
                  <MixSlider
                    value={prefs.masterVolume}
                    label={`Master volume ${Math.round(prefs.masterVolume * 100)}%`}
                    onChange={updateMasterVolume}
                  />
                  <span className="w-7 text-right text-[10px] tabular-nums text-white/30">
                    {Math.round(prefs.masterVolume * 100)}
                  </span>
                </div>
              )}

              <div className="os-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
                {hasMix && (
                  <div className="space-y-1">
                    <p className="px-1 pb-1 text-[9px] font-medium uppercase tracking-[0.16em] text-white/25">
                      Your mix
                    </p>
                    {prefs.layers.map((layer) => {
                      const track = activeTracks.find((candidate) => candidate.id === layer.id);
                      if (!track) return null;

                      return (
                        <ActiveTrackRow
                          key={track.id}
                          track={track}
                          volume={layer.volume}
                          onVolumeChange={(values) => updateLayerVolume(track.id, values)}
                          onRemove={() => removeTrack(track.id)}
                        />
                      );
                    })}
                  </div>
                )}

                {availableTracks.length > 0 && (
                  <div className={hasMix ? "mt-2 border-t border-white/[0.06] pt-2" : ""}>
                    <button
                      type="button"
                      onClick={() => setShowLibrary((visible) => !visible)}
                      aria-expanded={showLibrary}
                      className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-[11px] font-medium text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                    >
                      <Plus className="size-3.5" />
                      <span className="flex-1 text-left">Add sound</span>
                      {showLibrary ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {showLibrary && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-1 pt-1">
                            {availableTracks.map((track) => (
                              <button
                                key={track.id}
                                type="button"
                                onClick={() => addTrack(track.id)}
                                className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                              >
                                <span aria-hidden="true" className="text-[15px]">
                                  {track.icon}
                                </span>
                                <span className="truncate">{track.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getMixLabel(activeTracks: TrackInfo[]): string {
  if (activeTracks.length === 0) return "Soundscape";
  if (activeTracks.length === 1) return activeTracks[0].label;
  if (activeTracks.length === 2) return `${activeTracks[0].label} + ${activeTracks[1].label}`;
  return `${activeTracks.length}-sound mix`;
}

function MixSlider({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (values: number[]) => void;
}) {
  return (
    <Slider
      value={[value]}
      min={0}
      max={1}
      step={0.01}
      onValueChange={onChange}
      aria-label={label}
      className="flex-1 [&_[role=slider]]:size-3 [&_[role=slider]]:border-white/25 [&_[role=slider]]:bg-[#25252d] [&_.range]:bg-violet-400/65 [&_.track]:h-1 [&_.track]:bg-white/10"
    />
  );
}

function ActiveTrackRow({
  track,
  volume,
  onVolumeChange,
  onRemove,
}: {
  track: TrackInfo;
  volume: number;
  onVolumeChange: (values: number[]) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-lg px-2 text-white/65 hover:bg-white/[0.025]">
      <span aria-hidden="true" className="w-5 shrink-0 text-center text-[15px]">
        {track.icon}
      </span>
      <span className="w-20 truncate text-[11px]">{track.label}</span>
      <MixSlider
        value={volume}
        label={`${track.label} volume ${Math.round(volume * 100)}%`}
        onChange={onVolumeChange}
      />
      <button
        type="button"
        onClick={onRemove}
        title={`Remove ${track.label}`}
        aria-label={`Remove ${track.label}`}
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-white/[0.05] hover:text-white/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
