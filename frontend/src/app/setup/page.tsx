"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { saveRun } from "@/lib/run";
import { playAlert, unlockAudio } from "@/lib/audio";

export default function Setup() {
  const router = useRouter();
  const [study, setStudy] = useState(25);
  const [brk, setBrk] = useState(5);
  const [sound, setSound] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [audioOk, setAudioOk] = useState<boolean | null>(null);

  const valid = study >= 1 && study <= 180 && brk >= 1 && brk <= 60 && Number.isInteger(study) && Number.isInteger(brk);

  async function start() {
    setBusy(true); setErr(null);
    try {
      await unlockAudio(); // klik pengguna → izin audio
      const s = await api.createSession(study * 60, brk * 60);
      saveRun({ sessionId: s.id, studySeconds: s.configured_study_seconds, breakSeconds: s.configured_break_seconds, soundOn: sound });
      router.push("/session");
    } catch (e) {
      setErr(`Could not create session: ${(e as Error).message}. Make sure the backend is running.`);
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-lg space-y-5">
      <h1 className="text-2xl font-bold">Set up your Pomodoro</h1>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Study duration (minutes, 1–180)</span>
        <input className="input" type="number" min={1} max={180} value={study} onChange={(e) => setStudy(Number(e.target.value))} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Break duration (minutes, 1–60)</span>
        <input className="input" type="number" min={1} max={60} value={brk} onChange={(e) => setBrk(Number(e.target.value))} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Play a sound on alerts
      </label>
      <div className="text-sm muted space-y-1">
        <p>The camera is requested when the study session starts. If denied, the timer still runs without drowsiness monitoring.</p>
        <button className="underline" onClick={async () => setAudioOk(await playAlert(1))}>Test audio</button>
        {audioOk !== null && <span> — {audioOk ? "you should hear two beeps" : "audio blocked by the browser"}</span>}
      </div>
      {err && <p className="text-sm text-[#b4234f]">{err}</p>}
      <button className="btn btn-primary w-full" disabled={!valid || busy} onClick={start}>
        {busy ? "Getting ready…" : "Start study session"}
      </button>
    </div>
  );
}
