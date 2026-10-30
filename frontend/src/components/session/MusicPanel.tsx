"use client";
import { IconAdjustmentsHorizontal, IconMusic, IconPlayerPauseFilled, IconPlayerPlayFilled, IconVolume, IconVolumeOff } from "@tabler/icons-react";
import { useMusic } from "@/hooks/useMusic";
import { setTrack, setVolume, startMusic, stopMusic, TRACKS, type TrackId } from "@/lib/music";
import { Waveform } from "@/components/ui/Waveform";

/** Panel "A little background calm" (Figma Focus Session): pilih soundtrack, putar/jeda, volume, waveform. */
export function MusicPanel() {
  const m = useMusic();
  const track = TRACKS.find((t) => t.id === m.track) ?? TRACKS[0];
  return (
    <section className="card space-y-3 !rounded-3xl" aria-label="Background music" data-music>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--accent)", color: "var(--btn)" }}><IconAdjustmentsHorizontal size={20} /></span>
        <div className="flex-1">
          <h3 className="text-sm font-bold">A little background calm</h3>
          <p className="text-xs muted">{m.playing ? (m.energized ? "Music is on · a bit brighter to keep you company" : "Music is on") : "Music is off"}</p>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg border" style={{ borderColor: "var(--line)" }} aria-label={m.playing ? "Mute music" : "Play music"}
                onClick={() => (m.playing ? stopMusic() : void startMusic())}>
          {m.playing ? <IconVolume size={18} /> : <IconVolumeOff size={18} />}
        </button>
      </div>
      <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "var(--soft)" }}>
        <IconMusic size={18} aria-hidden />
        <div className="flex-1 leading-tight">
          <p className="text-sm font-semibold">{track.name}</p>
          <p className="text-[11px] muted">{track.hint}</p>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: "var(--brand)" }} aria-label={m.playing ? "Pause music" : "Play music"}
                onClick={() => (m.playing ? stopMusic() : void startMusic())}>
          {m.playing ? <IconPlayerPauseFilled size={16} /> : <IconPlayerPlayFilled size={16} />}
        </button>
      </div>
      <Waveform playing={m.playing} />
      <div className="flex items-center gap-3">
        <select className="field !py-2 text-sm" value={m.track} aria-label="Soundtrack" onChange={(e) => setTrack(e.target.value as TrackId)}>
          {TRACKS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="range" min={0} max={1} step={0.05} value={m.volume} aria-label="Volume" className="w-28 accent-[#684a91]" onChange={(e) => setVolume(Number(e.target.value))} />
      </div>
    </section>
  );
}
