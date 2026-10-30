"use client";
import { IconActivityHeartbeat, IconBell, IconBellOff, IconMusic, IconPlayerPauseFilled, IconPlayerPlayFilled } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert1Modal, Alert2Modal, AdviceModal, ConfirmModal } from "@/components/alerts/AlertModals";
import { MusicPanel } from "@/components/session/MusicPanel";
import { StatusBadge } from "@/components/session/StatusBadge";
import { useCountdown } from "@/hooks/useCountdown";
import { useMusic } from "@/hooks/useMusic";
import { useWebcam } from "@/hooks/useWebcam";
import { api, ApiError } from "@/lib/api";
import { playAlert, unlockAudio } from "@/lib/audio";
import { mmssSpaced } from "@/lib/format";
import { duckMusic, setEnergized, startMusic, stopMusic } from "@/lib/music";
import { loadRun, patchRun, saveRun, type Run } from "@/lib/run";
import type { AlertOut, PredictResponse } from "@/types/api";

const FRAME_INTERVAL_MS = 700; // jeda antar frame; frame berikutnya menunggu respons sebelumnya

function Ring({ fraction }: { fraction: number }) {
  const r = 100, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 240 240" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
      <circle cx="120" cy="120" r={r} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="14" />
      <circle cx="120" cy="120" r={r} fill="none" stroke="#FFF34A" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(Math.max(fraction, 0.004), 1))} style={{ transition: "stroke-dashoffset .3s linear" }} />
    </svg>
  );
}

export default function SessionPage() {
  const router = useRouter();
  const cam = useWebcam();
  const music = useMusic();
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
  const [userPaused, setUserPaused] = useState(false);
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
  // Interaksi pertama juga menyalakan musik latar (kecuali klik tepat pada kontrol musik).
  useEffect(() => {
    const unlock = (e: Event) => {
      void unlockAudio();
      const onMusic = (e.target as HTMLElement | null)?.closest?.("[data-music]");
      if (!onMusic && loadRun()?.musicOn) void startMusic();
    };
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
        if (!cur.noCamera) camStart.current();
      } catch (e) {
        if (e instanceof ApiError && (e.status === 404 || e.status === 409)) { setLost(true); return; }
        setErr(`Could not start the study block: ${(e as Error).message}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Musik sedikit lebih cerah saat ada indikasi kantuk; kembali normal saat pulih.
  useEffect(() => {
    setEnergized(pred?.status === "POSSIBLE_DROWSINESS" || pred?.status === "DROWSY_NEED_REST");
  }, [pred?.status]);

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
    stopMusic();
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
                duckMusic();
                if (soundOn) setSoundBlocked(!(await playAlert(res.alert.level === 2 ? 2 : 1)));
                else setSoundBlocked(true);
              }
            } catch (e) {
              if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
                // Sesi hilang/berakhir di server: berhenti mengirim frame, jangan banjiri backend dengan 404.
                cancelled = true;
                camStop.current();
                stopMusic();
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
    stopMusic();
    try { await api.endSession(run.sessionId, reason); } catch (e) { setErr((e as Error).message); }
    router.push(`/wrap?id=${run.sessionId}`);
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
    stopMusic();
    router.push(`/wrap?id=${run.sessionId}`);
  }
  async function ready() {
    if (!run?.blockId) return;
    setBusy(true);
    try { await api.resumeBlock(run.sessionId, run.blockId); } catch (e) { setErr((e as Error).message); }
    setAdvice(null); resume(); setBusy(false);
  }
  function breakNow() { setAdvice(null); void finishBlock(); }

  function togglePause() {
    if (!run?.blockId) return;
    if (!userPaused) {
      setUserPaused(true); pause();
      api.pauseBlock(run.sessionId, run.blockId).catch(() => {});
    } else {
      setUserPaused(false); resume();
      api.resumeBlock(run.sessionId, run.blockId).catch(() => {});
    }
  }
  function toggleSound() {
    const v = !soundOn; setSoundOn(v); patchRun({ soundOn: v });
    if (v) void playAlert(1); // bip uji sekaligus membuka izin audio
  }

  if (lost) {
    return (
      <div className="page-wrap flex items-center justify-center p-4">
        <div className="card w-full max-w-lg space-y-4 text-center !rounded-3xl">
          <h1 className="text-2xl font-bold">This session is no longer available</h1>
          <p className="muted">The server no longer has this session (it may have restarted or ended). Your timer was stopped.</p>
          <div className="flex gap-3">
            <button className="btn btn-primary flex-1" onClick={() => { saveRun(null); router.push("/setup"); }}>Start a new session</button>
            <button className="btn flex-1" onClick={() => { saveRun(null); router.push("/"); }}>Go home</button>
          </div>
        </div>
      </div>
    );
  }
  if (!run) return <div className="page-wrap p-8"><p className="muted">{err ?? "Preparing your session…"}</p></div>;

  const monitoring = cam.state === "ready";
  const total = run.studySeconds;
  const elapsed = Math.max(total - remaining, 0);
  const fraction = total ? elapsed / total : 0;
  const cameraText = run.noCamera ? "Camera is off for this session (timer only)."
    : cam.state === "requesting" ? "Requesting camera permission…"
    : cam.state === "ready" ? "Camera connected — frames are only sent for analysis and never stored."
    : cam.state === "denied" ? "Camera permission denied: the timer runs without drowsiness monitoring."
    : cam.state === "unavailable" ? "Camera unavailable: the timer runs without drowsiness monitoring." : "Camera is off.";

  return (
    <div className="page-wrap px-4 pb-10 pt-5 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <Link href="/" className="flex flex-col" aria-label="Loopa home">
          <span className="flex items-center gap-2 text-3xl font-extrabold leading-none" style={{ color: "var(--brand)" }}>
            Loopa
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/loopa-mark.svg" alt="" width={36} height={32} />
          </span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest muted">Smart study companion</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden max-w-[16rem] truncate rounded-full px-3 py-1.5 font-semibold sm:inline" style={{ background: "var(--panel)" }}>{run.title ?? "Study Session"}</span>
          <button className="btn !rounded-full !px-3 !py-1.5" onClick={toggleSound} aria-label={soundOn ? "Turn alert sound off" : "Turn alert sound on"}>
            {soundOn ? <IconBell size={16} aria-hidden /> : <IconBellOff size={16} aria-hidden />}<span className="hidden sm:inline">{soundOn ? "Alert sound on" : "Alert sound off"}</span>
          </button>
        </div>
      </header>

      <div className="mt-2 text-center">
        <p className="eyebrow inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: "#f59e0b" }} />Focus mode is on</p>
        <h1 className="text-4xl font-bold">You&apos;re doing lovely</h1>
      </div>

      <div className="mx-auto mt-6 grid max-w-6xl gap-5 lg:grid-cols-2">
        <section className="card-brand relative flex flex-col items-center !rounded-[28px] !p-6 md:!p-8">
          <div className="flex w-full flex-1 flex-col items-center justify-center">
          <div className="flex w-full items-center justify-between">
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "var(--accent)", color: "var(--brand)" }}>Stay in your flow</span>
            <span className="eyebrow !text-white/70">Session {String(run.blockSeq ?? 1).padStart(2, "0")}</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative my-5 aspect-square w-full max-w-[17rem]">
            <Ring fraction={fraction} />
            <div className="absolute inset-[9%] flex flex-col items-center justify-center rounded-full bg-white" style={{ color: "var(--brand)" }}>
              <p className="eyebrow">{isPaused ? (alert || advice ? "Check-in" : "Paused") : "Time to focus"}</p>
              <p className="text-5xl font-bold tabular-nums" aria-live="off">{mmssSpaced(remaining)}</p>
              <p className="mt-1 text-xs muted">minutes of me-time</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-white" onClick={togglePause} disabled={!!alert || !!advice}>
              {userPaused ? <IconPlayerPlayFilled size={16} aria-hidden /> : <IconPlayerPauseFilled size={16} aria-hidden />}{userPaused ? "Resume" : "Pause"}
            </button>
            <button className="btn-pink" onClick={() => { pause(); setConfirmEnd(true); }}>End session</button>
          </div>
          </div>
          </div>
          <div className="mt-6 w-full">
            <div className="h-px w-full bg-white/25"><div className="h-px bg-white" style={{ width: `${fraction * 100}%` }} /></div>
            <div className="mt-2 flex justify-between text-xs text-white/80">
              <span>{Math.floor(elapsed / 60)} min focused</span>
              <span className="inline-flex items-center gap-1"><IconMusic size={13} aria-hidden />{music.playing ? "Music on" : "Music off"}</span>
            </div>
          </div>
        </section>

        <div className="space-y-5">
          <section className="card space-y-3 !rounded-3xl" aria-label="Focus check-in">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--accent)", color: "var(--btn)" }}><IconActivityHeartbeat size={20} /></span>
              <div className="flex-1 leading-tight"><h2 className="text-sm font-bold">Focus check-in</h2><p className="text-xs muted">Webcam monitoring preview</p></div>
              <StatusBadge status={monitoring ? pred?.status ?? "UNCERTAIN" : null} />
            </div>
            <div className="rounded-2xl p-3" style={{ background: "#f3ecff" }}>
              <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16/9" }}>
                <video ref={cam.videoRef} autoPlay muted playsInline className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
                <span className="absolute bottom-2 left-3 inline-flex items-center gap-1.5 text-[11px] text-white">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: monitoring ? "#22c55e" : "#f59e0b" }} />{monitoring ? "Camera connected" : "Camera not connected"}
                </span>
              </div>
            </div>
            <p className="text-xs muted">{cameraText}</p>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div><p className="text-2xl font-bold">{pred?.blink_count ?? 0}</p><p className="text-xs muted">Blinks</p></div>
              <div><p className="text-2xl font-bold">{pred?.yawn_count ?? 0}</p><p className="text-xs muted">Yawns</p></div>
              <div><p className="text-2xl font-bold">{pred?.eye_closure_count ?? 0}</p><p className="text-xs muted">Long eye closures</p></div>
            </div>
            <p className="text-xs muted">Indication score (heuristic, not a medical probability): <b>{pred?.drowsiness_score ?? 0}</b>/100</p>
          </section>
          <div data-music><MusicPanel /></div>
        </div>
      </div>

      {err && <p className="mt-4 text-center text-sm" style={{ color: "var(--danger)" }}>{err}</p>}

      {alert?.level === 1 && <Alert1Modal onAck={ack} soundBlocked={soundBlocked} />}
      {alert?.level === 2 && <Alert2Modal onContinue={cont} onEnd={endFromAlert} busy={busy} soundBlocked={soundBlocked} />}
      {advice && <AdviceModal advice={advice} onReady={ready} onBreak={breakNow} busy={busy} breakMinutes={Math.round(run.breakSeconds / 60)} />}
      {confirmEnd && (
        <ConfirmModal
          text="End the session now? Your data is saved and you'll see your summary."
          onNo={() => { setConfirmEnd(false); if (!alert && !advice && !userPaused) resume(); }}
          onYes={() => endSession("MANUAL")}
        />
      )}
    </div>
  );
}
