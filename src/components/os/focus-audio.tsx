import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Headphones, Play, Pause } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { getAvailableTracks, playTracks, stopAll, setVolume, muteAll, loadPrefs, savePrefs } from "@/lib/audio-engine";
import type { AudioPrefs, TrackInfo } from "@/lib/audio-engine";

const tracks = getAvailableTracks();

export function FocusAudio() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<AudioPrefs>(() => {
    try { return loadPrefs(); } catch { return { activeTrackIds: [], volume: 0.5, muted: false }; }
  });
  const [activeIds, setActiveIds] = useState<string[]>(prefs.activeTrackIds);
  const [volume, setVolumeState] = useState(prefs.muted ? 0 : prefs.volume);
  const [muted, setMuted] = useState(prefs.muted);
  const initialized = useRef(false);
  const prevVolume = useRef(prefs.volume);

  useEffect(() => {
    try {
      if (initialized.current) return;
      initialized.current = true;
      if (prefs.activeTrackIds.length > 0 && !prefs.muted) {
        playTracks(prefs.activeTrackIds, prefs.volume);
      }
    } catch { /* init */ }
  }, []);

  function toggleTrack(id: string) {
    try {
      const next = activeIds.includes(id)
        ? activeIds.filter((a) => a !== id)
        : [...activeIds, id];
      setActiveIds(next);
      updatePrefs({ activeTrackIds: next });
      if (next.length === 0) {
        stopAll();
      } else {
        playTracks(next, muted ? 0 : volume);
      }
    } catch { /* toggle */ }
  }

  function toggleMute() {
    try {
      const nextMuted = !muted;
      setMuted(nextMuted);
      updatePrefs({ muted: nextMuted });
      if (nextMuted) {
        muteAll();
      } else {
        setVolume(prevVolume.current);
        setVolumeState(prevVolume.current);
        if (activeIds.length > 0) {
          playTracks(activeIds, prevVolume.current);
        }
      }
    } catch { /* mute */ }
  }

  function onVolumeChange(v: number[]) {
    try {
      const val = v[0];
      setVolumeState(val);
      prevVolume.current = val;
      if (muted) {
        setMuted(false);
        updatePrefs({ muted: false, volume: val });
      } else {
        updatePrefs({ volume: val });
      }
      setVolume(val);
      if (activeIds.length > 0 && muted) {
        playTracks(activeIds, val);
      }
    } catch { /* volume */ }
  }

  function updatePrefs(partial: Partial<AudioPrefs>) {
    try {
      const next = { ...prefs, ...partial };
      setPrefs(next);
      savePrefs(next);
    } catch { /* prefs */ }
  }

  const hasActive = activeIds.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
          open || hasActive
            ? "text-violet-200 bg-white/[0.06]"
            : "text-white/40 hover:bg-white/5 hover:text-white/80"
        }`}
      >
        <span className="relative">
          <Headphones className={`h-4 w-4 ${hasActive && !muted ? "text-violet-300" : ""}`} />
          {hasActive && !muted && (
            <motion.span
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 block h-full w-full rounded-full bg-violet-400/30 blur-sm"
            />
          )}
        </span>
        <span className="flex-1 text-left">Focus Audio</span>
        {hasActive && !muted && (
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute bottom-full left-2 mb-2 w-[280px] origin-bottom-left overflow-hidden rounded-2xl border border-white/10 bg-black/70 backdrop-blur-2xl shadow-2xl shadow-black/60"
          >
            <div className="px-4 pb-3 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.15em] text-white/40">
                  Soundscape
                </span>
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                    muted
                      ? "border-white/10 bg-white/[0.02] text-white/30"
                      : "border-violet-400/40 bg-violet-500/10 text-violet-200"
                  }`}
                  title={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {tracks.map((t) => (
                  <TrackCard
                    key={t.id}
                    track={t}
                    active={activeIds.includes(t.id)}
                    muted={muted}
                    onClick={() => toggleTrack(t.id)}
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wider text-white/30">Vol</span>
                <Slider
                  value={muted ? [0] : [volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={onVolumeChange}
                  className="flex-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-violet-400/50 [&_[role=slider]]:bg-violet-500/30 [&_.range]:bg-gradient-to-r [&_.range]:from-violet-500 [&_.range]:to-fuchsia-500 [&_.track]:bg-white/10"
                />
                <span className="w-8 text-right text-[11px] text-white/40">
                  {Math.round((muted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrackCard({
  track,
  active,
  muted,
  onClick,
}: {
  track: TrackInfo;
  active: boolean;
  muted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[12px] transition-all ${
        active && !muted
          ? "border-violet-400/40 bg-violet-500/10 text-violet-100 shadow-[0_0_16px_rgba(139,92,246,0.15)]"
          : active && muted
            ? "border-white/10 bg-white/[0.03] text-white/40"
            : "border-white/5 bg-white/[0.02] text-white/40 hover:border-white/10 hover:text-white/70"
      }`}
    >
      <span className="text-xl">{track.icon}</span>
      <span className="text-center leading-tight">{track.label}</span>
    </button>
  );
}
