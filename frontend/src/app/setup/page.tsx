"use client";
import { IconMusic, IconPlayerPlayFilled, IconShieldCheckFilled } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { playAlert, unlockAudio } from "@/lib/audio";
import { setTrack, startMusic, TRACKS, type TrackId } from "@/lib/music";
import { useMusic } from "@/hooks/useMusic";
import { saveRun } from "@/lib/run";

const FOCUS_PRESETS = [15, 25, 45, 60, 90];
const BREAK_PRESETS = [3, 5, 10, 15, 20];

function MinutesField({ label, value, onChange, presets, max }: { label: string; value: number; onChange: (n: number) => void; presets: number[]; max: number }) {
  return (
    <div>
      <p className="mb-1 text-sm font-bold">{label}</p>
      <div className="flex gap-2">
        <input className="field !w-32" type="number" min={1} max={max} inputMode="numeric" aria-label={`${label} in minutes`} placeholder="Type in minutes"
               value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Number(e.target.value))} />
        <select className="field !w-40" aria-label={`${label} presets`} value="" onChange={(e) => e.target.value && onChange(Number(e.target.value))}>
          <option value="">Choose</option>
          {presets.map((p) => <option key={p} value={p}>{p} min</option>)}
        </select>
      </div>
    </div>
  );
}

export default function Setup() {
  const a = useRequireAuth();
  const router = useRouter();
  const music = useMusic();
  const [title, setTitle] = useState("Study Session");
  const [study, setStudy] = useState(25);
  const [brk, setBrk] = useState(5);
  const [musicOn, setMusicOn] = useState(true);
  const [mandatory, setMandatory] = useState(true);
  const [step, setStep] = useState<"form" | "camera">("form");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [audioMsg, setAudioMsg] = useState<string | null>(null);

  if (!a.ready) return null;
  const valid = study >= 1 && study <= 180 && brk >= 1 && brk <= 60 && Number.isInteger(study) && Number.isInteger(brk) && title.trim().length > 0;

  async function begin(noCamera: boolean) {
    setBusy(true); setErr(null);
    try {
      await unlockAudio(); // klik pengguna -> izin audio
      if (musicOn) void startMusic(music.track);
      const s = await api.createSession({ study: study * 60, brk: brk * 60, title: title.trim(), mandatoryBreak: mandatory, soundtrack: music.track });
      saveRun({
        sessionId: s.id, studySeconds: s.configured_study_seconds, breakSeconds: s.configured_break_seconds, soundOn: true,
        title: s.title, mandatoryBreak: s.mandatory_break, soundtrack: s.soundtrack, musicOn, noCamera,
      });
      router.push("/session");
    } catch (e) {
      setErr(`Could not create the session: ${(e as Error).message}. Make sure the backend is running.`);
      setBusy(false); setStep("form");
    }
  }

  return (
    <div className="page-wrap">
      <header className="px-6 pt-6">
        <Link href="/" className="inline-flex flex-col" aria-label="Loopa home">
          <span className="flex items-center gap-2 text-3xl font-extrabold leading-none" style={{ color: "var(--brand)" }}>
            Loopa
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/loopa-mark.svg" alt="" width={36} height={32} />
          </span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest muted">Smart study companion</span>
        </Link>
      </header>

      {step === "form" && (
        <Modal icon={<IconPlayerPlayFilled size={28} />} eyebrow="Your next session" title="Let's set your focus" onClose={() => router.push("/")}>
          <p className="-mt-2 text-sm muted">Choose what you&apos;re working on and make this session yours.</p>
          <label className="block text-sm font-bold">What are we working on?
            <input className="field mt-1" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <MinutesField label="Choose your focus time" value={study} onChange={setStudy} presets={FOCUS_PRESETS} max={180} />
          <MinutesField label="Choose your break time" value={brk} onChange={setBrk} presets={BREAK_PRESETS} max={60} />
          <div>
            <p className="mb-1 text-sm font-bold">Focus soundtrack</p>
            <select className="field" value={music.track} aria-label="Focus soundtrack" onChange={(e) => setTrack(e.target.value as TrackId)}>
              {TRACKS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button type="button" className="mt-1 text-xs underline muted" onClick={async () => setAudioMsg((await playAlert(1)) ? "You should hear two beeps." : "Audio is blocked by the browser. Click anywhere and try again.")}>Test audio</button>
            {audioMsg && <span className="ml-2 text-xs muted">{audioMsg}</span>}
          </div>
          <div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold muted"><IconMusic size={18} aria-hidden />Music during focus</span>
              <button role="switch" aria-checked={musicOn} aria-label="Music during focus" className="toggle" onClick={() => setMusicOn(!musicOn)} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm"><b className="block">Mandatory break</b><span className="text-xs muted">Rest first; the next session starts after your break.</span></span>
              <button role="switch" aria-checked={mandatory} aria-label="Mandatory break" className="toggle" onClick={() => setMandatory(!mandatory)} />
            </div>
          </div>
          {err && <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>{err}</p>}
          <button className="btn-push" disabled={!valid} onClick={() => setStep("camera")}>
            <IconPlayerPlayFilled size={18} aria-hidden />Continue to camera setup
          </button>
        </Modal>
      )}

      {step === "camera" && (
        <Modal icon={<IconShieldCheckFilled size={30} />} eyebrow="Before we begin" title="Can we use your camera?" onClose={() => setStep("form")}>
          <p className="muted">
            Loopa needs camera access for the focus-check feature. The camera will be active during this session. The drowsiness detection will analyze visual cues to identify possible signs of sleepiness and provide timely break reminders. Video is never stored.
          </p>
          <p className="rounded-2xl p-4 text-sm muted" style={{ background: "var(--panel)" }}>
            Your browser may show its own permission popup after you choose &ldquo;Allow camera &amp; start&rdquo;. You can choose not to continue if you prefer.
          </p>
          {err && <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>{err}</p>}
          <button className="btn-push" disabled={busy} onClick={() => begin(false)}>
            <IconShieldCheckFilled size={20} color="#FFF34A" aria-hidden />{busy ? "Starting…" : "Allow camera & start"}
          </button>
          <button className="w-full text-center text-lg font-bold" style={{ color: "var(--btn)" }} onClick={() => setStep("form")}>Not now</button>
          <button className="w-full text-center text-xs underline muted" disabled={busy} onClick={() => begin(true)}>Start without camera (timer only, no drowsiness monitoring)</button>
        </Modal>
      )}
    </div>
  );
}
