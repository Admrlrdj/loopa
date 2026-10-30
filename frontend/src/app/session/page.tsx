"use client";
import { useRouter } from "next/navigation";
import { IconBell, IconBellOff, IconPlayerStopFilled } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { loadRun, patchRun, saveRun, type Run } from "@/lib/run";
import { playAlert, unlockAudio } from "@/lib/audio";
import { mmss } from "@/lib/format";
import { useCountdown } from "@/hooks/useCountdown";
import { useWebcam } from "@/hooks/useWebcam";
import { StatusBadge } from "@/components/session/StatusBadge";
import { Alert1Modal, Alert2Modal, AdviceModal, ConfirmModal } from "@/components/alerts/AlertModals";
import type { AlertOut, PredictResponse } from "@/types/api";

const FRAME_INTERVAL_MS = 700; // jeda antar frame; frame berikutnya menunggu respons sebelumnya

export default function SessionPage() {
  const router = useRouter();
  const cam = useWebcam();
  const [run, setRun] = useState<Run | null>(null);
  const [timing, setTiming] = useState<{ startedAt: number | null; pausedMs: number; pausedSince: number | null }>({ startedAt: null, pausedMs: 0, pausedSince: null });
  const initRef = useRef(false);
  const grabRef = useRef(cam.grab);
  grabRef.current = cam.grab;
  const camStop = useRef(cam.stop);
  camStop.current = cam.stop;
  const camStart = useRef(cam.start);
  camStart.current = cam.start;
  const [err, setErr] = useState<string | null>(null);
  const [pred, setPred] = useState<PredictResponse | null>(null);
  const [alert, setAlert] = useState<AlertOut | null>(null);
  const [advice, setAdvice] = useState<string[] | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lost, setLost] = useState(false); // sesi tidak ada lagi di server (mis. backend restart)
  const [soundOn, setSoundOn] = useState(true);
  const [soundBlocked, setSoundBlocked] = useState(false);

  const handledAlert = useRef<string | null>(null);
  const paused = useRef(false);
  const finishing = useRef(false);

  const isPaused = timing.pausedSince != null;
  paused.current = isPaused || !!alert || !!advice || confirmEnd;

  // Browser memblokir audio sampai ada interaksi di dokumen yang sama; setelah refresh kunci audio hilang.
  useEffect(() => {
    const unlock = () => { void unlockAudio(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);

  // Inisialisasi: ambil run, mulai blok belajar, nyalakan kamera.
  useEffect(() => {
    if (initRef.current) return; // StrictMode menjalankan efek dua kali di dev
    initRef.current = true;
    const r = loadRun();
    if (!r) { router.replace("/setup"); return; }
    setSoundOn(r.soundOn);
    (async () => {
      try {
        let cur: Run = r;
        if (!cur.blockId) {
          const b = await api.startBlock(cur.sessionId);
          cur = patchRun({ blockId: b.id, blockSeq: b.sequence_number, blockStartedAt: Date.now(), pausedMs: 0, pausedSince: null }) ?? cur;
        }
        setRun(cur);
        setTiming({ startedAt: cur.blockStartedAt ?? Date.now(), pausedMs: cur.pausedMs ?? 0, pausedSince: cur.pausedSince ?? null });
        camStart.current();
      } catch (e) {
        if (e instanceof ApiError && (e.status === 404 || e.status === 409)) { setLost(true); return; }
        setErr(`Could not start the study block: ${(e as Error).message}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = useCallback(() => {
    setTiming((t) => (t.pausedSince == null ? { ...t, pausedSince: Date.now() } : t));
  }, []);
  const resume = useCallback(() => {
    setTiming((t) => (t.pausedSince != null ? { ...t, pausedMs: t.pausedMs + (Date.now() - t.pausedSince), pausedSince: null } : t));
  }, []);
  // Simpan status timer agar refresh tidak menghilangkan sisa waktu.
  useEffect(() => {
    if (timing.startedAt != null) patchRun({ blockStartedAt: timing.startedAt, pausedMs: timing.pausedMs, pausedSince: timing.pausedSince });
  }, [timing]);

  const finishBlock = useCallback(async () => {
    if (finishing.current || !run?.blockId) return;
    finishing.current = true;
    camStop.current();
    try { await api.completeBlock(run.sessionId, run.blockId); } catch { /* backend mengabaikan duplikat */ }
    patchRun({ blockId: undefined, blockStartedAt: undefined, pausedMs: 0, pausedSince: null });
    router.push("/break");
  }, [run, router]);

  const remaining = useCountdown(
    run?.studySeconds ?? 0, timing.startedAt, timing.pausedMs, timing.pausedSince, finishBlock,
  );

  // Pompa frame: hanya saat kamera siap dan tidak ada modal.
  useEffect(() => {
    if (cam.state !== "ready" || !run?.blockId) return;
    let cancelled = false;
    const sid = run.sessionId;
    (async () => {
      while (!cancelled) {
        if (!paused.current && !finishing.current) {
          const frame = grabRef.current();
          if (frame) {
            try {
              const res = await api.predict(sid, frame, crypto.randomUUID());
              if (cancelled) break;
              setPred(res);
              if (res.alert && res.alert.id !== handledAlert.current && !paused.current) {
                handledAlert.current = res.alert.id;
                setAlert(res.alert);
                pause();
                if (soundOn) setSoundBlocked(!(await playAlert(res.alert.level === 2 ? 2 : 1)));
                else setSoundBlocked(true);
              }
            } catch (e) {
              if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
                // Sesi hilang/berakhir di server: berhenti mengirim frame, jangan banjiri backend dengan 404.
                cancelled = true;
                camStop.current();
                setLost(true);
                break;
              }
              setErr(`Backend connection problem: ${(e as Error).message}`);
              await new Promise((r) => setTimeout(r, 3000)); // jeda lebih lama saat jaringan bermasalah
            }
          }
        }
        await new Promise((r) => setTimeout(r, FRAME_INTERVAL_MS));
      }
    })();
    return () => { cancelled = true; };
  }, [cam.state, run?.blockId, run?.sessionId, soundOn, pause]);

  async function endSession(reason: string) {
    if (!run) return;
    camStop.current();
    try { await api.endSession(run.sessionId, reason); } catch (e) { setErr((e as Error).message); }
    router.push(`/summary?id=${run.sessionId}`);
  }

  async function ack() {
    if (!run || !alert) return;
    setBusy(true);
    try { await api.respondAlert(run.sessionId, alert.id, "ACKNOWLEDGE"); } catch { /* idempoten */ }
    setAlert(null); resume(); setBusy(false);
  }
  async function cont() {
    if (!run || !alert) return;
    setBusy(true);
    try {
      const r = await api.respondAlert(run.sessionId, alert.id, "CONTINUE");
      setAlert(null); setAdvice(r.advice);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  async function endFromAlert() {
    if (!run || !alert) return;
    setBusy(true);
    try { await api.respondAlert(run.sessionId, alert.id, "END_SESSION"); } catch { /* sesi mungkin sudah berakhir */ }
    camStop.current();
    router.push(`/summary?id=${run.sessionId}`);
  }
  async function ready() {
    if (!run?.blockId) return;
    setBusy(true);
    try { await api.resumeBlock(run.sessionId, run.blockId); } catch (e) { setErr((e as Error).message); }
    setAdvice(null); resume(); setBusy(false);
  }
  function toggleSound() {
    const v = !soundOn; setSoundOn(v); patchRun({ soundOn: v });
    if (v) playAlert(1); // bip uji sekaligus membuka izin audio
  }

  if (lost) {
    return (
      <div className="card mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-bold">This session is no longer available</h1>
        <p className="muted">The server no longer has this session (it may have restarted or ended). Your timer was stopped.</p>
        <div className="flex gap-3">
          <button className="btn btn-primary flex-1" onClick={() => { saveRun(null); router.push("/setup"); }}>Start a new session</button>
          <button className="btn flex-1" onClick={() => { saveRun(null); router.push("/"); }}>Go home</button>
        </div>
      </div>
    );
  }
  if (!run) return <p className="muted">{err ?? "Preparing your session…"}</p>;

  const monitoring = cam.state === "ready";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">You&apos;re doing lovely</h1>
          <p className="text-sm muted">Study session #{run.blockSeq ?? 1} · focus mode is on</p>
        </div>
        <StatusBadge status={monitoring ? pred?.status ?? "UNCERTAIN" : null} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-2">
          <video ref={cam.videoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black" style={{ transform: "scaleX(-1)", aspectRatio: "4/3" }} />
          <p className="text-sm muted">
            {cam.state === "requesting" && "Requesting camera permission…"}
            {cam.state === "ready" && "Camera on — frames are only sent for analysis and never stored."}
            {cam.state === "denied" && "Camera permission denied: the timer runs without drowsiness monitoring."}
            {cam.state === "unavailable" && "Camera unavailable: the timer runs without drowsiness monitoring."}
          </p>
        </div>

        <div className="card space-y-4">
          <div className="card-brand flex flex-col items-center gap-2">
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "var(--accent)", color: "var(--brand)" }}>
              Stay in your flow
            </span>
            <div className="flex h-48 w-48 flex-col items-center justify-center rounded-full bg-white" style={{ color: "var(--brand)" }}>
              <p className="text-xs uppercase tracking-wide muted">{isPaused ? "Paused" : "Time left"}</p>
              <p className="text-5xl font-extrabold tabular-nums" aria-live="off">{mmss(remaining)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div><p className="text-2xl font-bold">{pred?.blink_count ?? 0}</p><p className="muted">Blinks</p></div>
            <div><p className="text-2xl font-bold">{pred?.yawn_count ?? 0}</p><p className="muted">Yawns</p></div>
            <div><p className="text-2xl font-bold">{pred?.eye_closure_count ?? 0}</p><p className="muted">Long eye closures</p></div>
          </div>
          <p className="text-sm muted">
            Indication score (heuristic, not a medical probability): <b>{pred?.drowsiness_score ?? 0}</b>/100
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={toggleSound}>{soundOn ? <IconBell size={18} aria-hidden /> : <IconBellOff size={18} aria-hidden />}{soundOn ? "Sound on" : "Sound off"}</button>
            <button className="btn btn-danger" onClick={() => { pause(); setConfirmEnd(true); }}><IconPlayerStopFilled size={16} aria-hidden />End session</button>
          </div>
        </div>
      </div>

      {err && <p className="text-sm text-[#b4234f]">{err}</p>}

      {alert?.level === 1 && <Alert1Modal onAck={ack} soundBlocked={soundBlocked} />}
      {alert?.level === 2 && <Alert2Modal onContinue={cont} onEnd={endFromAlert} busy={busy} soundBlocked={soundBlocked} />}
      {advice && <AdviceModal advice={advice} onReady={ready} busy={busy} />}
      {confirmEnd && (
        <ConfirmModal
          text="End the session now? Your data is saved and you'll see your summary."
          onNo={() => { setConfirmEnd(false); if (!alert && !advice) resume(); }}
          onYes={() => endSession("MANUAL")}
        />
      )}
    </div>
  );
}
