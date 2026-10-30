"use client";
import { IconBrain, IconClock, IconDroplet, IconEyeOff, IconHeartFilled, IconSparkles } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmModal } from "@/components/alerts/AlertModals";
import { AiModelNote } from "@/components/ui/AiModelNote";
import { MugIllustration, StretchFigure } from "@/components/ui/Illustrations";
import { useCountdown } from "@/hooks/useCountdown";
import { api, ApiError } from "@/lib/api";
import { mmss } from "@/lib/format";
import { loadRun, patchRun, saveRun, type Run } from "@/lib/run";
import type { InsightOut } from "@/types/api";

type Phase = "ready" | "running" | "done";

const STRETCHES = [
  { pose: "reach" as const, tile: "#FFF34A", title: "Reach for the sky", text: "Raise both arms overhead and stretch gently. Hold for 15–20 seconds." },
  { pose: "shoulder" as const, tile: "#E8E0FF", title: "Shoulder rolls", text: "Roll your shoulders back slowly, then relax. Repeat 5 times." },
  { pose: "neck" as const, tile: "#FBDDEB", title: "Gentle neck stretch", text: "Tilt your head to each side without forcing it. Hold 10 seconds per side." },
];

export default function BreakPage() {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tip, setTip] = useState<InsightOut | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const [lost, setLost] = useState(false); // sesi hilang di server (mis. backend restart)
  const [confirmEnd, setConfirmEnd] = useState(false);
  const completed = useRef(false);
  const tipAsked = useRef(false);
  const autoStarted = useRef(false);

  useEffect(() => {
    const r = loadRun();
    if (!r) { router.replace("/setup"); return; }
    setRun(r);
    if (r.breakId && r.breakStartedAt) setPhase("running"); // pulih setelah refresh
    if (!tipAsked.current) { // satu tip per kunjungan; gagal = tidak tampil
      tipAsked.current = true;
      api.breakTip(r.sessionId).then(setTip).catch(() => setTip(null));
    }
  }, [router]);

  const finish = useCallback(async () => {
    if (completed.current || !run?.breakId) return;
    completed.current = true;
    try { await api.completeBreak(run.sessionId, run.breakId); } catch { /* duplikat diabaikan */ }
    patchRun({ breakId: undefined, breakStartedAt: undefined });
    setPhase("done");
    if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Break is over");
  }, [run]);

  const remaining = useCountdown(run?.breakSeconds ?? 0, phase === "running" ? run?.breakStartedAt ?? null : null, 0, null, finish);

  const startBreak = useCallback(async () => {
    if (!run) return;
    setBusy(true); setErr(null);
    try {
      const b = await api.startBreak(run.sessionId);
      setRun(patchRun({ breakId: b.id, breakStartedAt: Date.now() }));
      setPhase("running");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 409)) setLost(true);
      else setErr((e as Error).message);
    }
    setBusy(false);
  }, [run]);

  // Istirahat wajib: hitung mundur dimulai otomatis begitu halaman ini terbuka.
  useEffect(() => {
    if (run && phase === "ready" && run.mandatoryBreak !== false && !autoStarted.current) {
      autoStarted.current = true;
      void startBreak();
    }
  }, [run, phase, startBreak]);

  function retryTip() {
    if (!run || tipLoading) return;
    setTipLoading(true);
    api.breakTip(run.sessionId).then(setTip).catch(() => {}).finally(() => setTipLoading(false));
  }
  async function endAll() {
    if (!run) return;
    setBusy(true);
    if (run.breakId && !completed.current) { try { await api.completeBreak(run.sessionId, run.breakId); } catch { /* */ } }
    try { await api.endSession(run.sessionId, "COMPLETED"); } catch (e) {
      if (e instanceof ApiError && e.status === 404) { setLost(true); setBusy(false); return; }
      setErr((e as Error).message);
    }
    router.push(`/wrap?id=${run.sessionId}`);
  }

  if (lost) {
    return (
      <div className="page-wrap flex items-center justify-center p-4">
        <div className="card w-full max-w-lg space-y-4 text-center !rounded-3xl">
          <h1 className="text-2xl font-bold">This session is no longer available</h1>
          <p className="muted">The server no longer has this session (it may have restarted or ended). Your progress on the server was lost, but you can start a new one.</p>
          <div className="flex gap-3">
            <button className="btn btn-primary flex-1" onClick={() => { saveRun(null); router.push("/setup"); }}>Start a new session</button>
            <button className="btn flex-1" onClick={() => { saveRun(null); router.push("/"); }}>Go home</button>
          </div>
        </div>
      </div>
    );
  }
  if (!run) return null;

  const mandatory = run.mandatoryBreak !== false;
  const total = run.breakSeconds || 1;
  const fraction = phase === "done" ? 1 : phase === "running" ? 1 - remaining / total : 0;

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <section className="flex flex-col gap-6 bg-white p-6 md:p-10">
        <Link href="/" className="flex w-fit flex-col" aria-label="Loopa home">
          <span className="flex items-center gap-2 text-3xl font-extrabold leading-none" style={{ color: "var(--brand)" }}>
            Loopa
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/loopa-mark.svg" alt="" width={36} height={32} />
          </span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest muted">Smart study companion</span>
        </Link>
        <MugIllustration className="mx-auto w-full max-w-sm" />
        <div>
          <p className="eyebrow inline-flex items-center gap-1.5"><IconHeartFilled size={12} color="#d77fb0" aria-hidden />Your reset moment</p>
          <h1 className="mt-1 text-4xl font-bold md:text-5xl">Rest is productive, too.</h1>
          <p className="mt-1 muted">A little movement and a moment away from the screen</p>
        </div>
        <ul className="space-y-4">
          {[
            { Icon: IconDroplet, t: "Drink some water", d: "Take a few sips and hydrate" },
            { Icon: IconEyeOff, t: "Rest your eyes", d: "Look away from the screen for a moment" },
            { Icon: IconBrain, t: "Mind pause", d: "Stop studying during this little reset" },
          ].map(({ Icon, t, d }) => (
            <li key={t} className="flex items-center gap-3">
              <Icon size={22} color="#30205F" aria-hidden />
              <span className="leading-tight"><b className="block text-sm">{t}</b><span className="text-xs muted">{d}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6 p-6 md:p-10" style={{ background: "#fafafa" }}>
        <div className="rounded-3xl p-6 text-center shadow-sm" style={{ background: "linear-gradient(120deg, #fff34a, #fffbd0)" }}>
          <p className="eyebrow">{mandatory ? "Mandatory break" : "Break time"}</p>
          {phase === "done" ? (
            <>
              <p className="my-2 text-4xl font-bold">Break is over</p>
              <p className="text-sm muted">Ready to continue? The camera will not turn on automatically.</p>
              <div className="mx-auto mt-4 flex max-w-sm flex-col gap-2">
                <button className="btn-push" onClick={() => router.push("/session")}>Start next session</button>
                <button className="btn w-full !rounded-2xl" disabled={busy} onClick={endAll}>Finish</button>
              </div>
            </>
          ) : phase === "running" ? (
            <>
              <p className="my-2 text-6xl font-bold tabular-nums md:text-7xl">{mmss(remaining)}</p>
              <div className="mx-auto h-1.5 max-w-md rounded-full bg-[#30205f]/15"><div className="h-1.5 rounded-full" style={{ width: `${fraction * 100}%`, background: "linear-gradient(90deg,#30205f,#8b6bcf)" }} /></div>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs muted"><IconClock size={13} aria-hidden />Your next session is ready when the timer ends. The camera stays off during your break.</p>
              {!mandatory && <div className="mt-3"><button className="btn !rounded-xl" onClick={finish}>Skip the rest of the break</button></div>}
            </>
          ) : (
            <>
              <p className="my-2 text-2xl font-bold">Take {Math.round(run.breakSeconds / 60)} minutes to rest</p>
              <div className="mx-auto max-w-xs"><button className="btn-push" disabled={busy} onClick={startBreak}>Start break</button></div>
              <button className="mt-3 text-sm underline muted" disabled={busy} onClick={endAll}>Finish without a break</button>
            </>
          )}
          {err && <p role="alert" className="mt-2 text-sm" style={{ color: "var(--danger)" }}>{err}</p>}
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold">3 little stretches</h2>
            <span className="eyebrow">Gentle movement</span>
          </div>
          <div className="mt-3 space-y-3">
            {STRETCHES.map((s, i) => (
              <div key={s.title} className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-sm">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl" style={{ background: s.tile }}><StretchFigure pose={s.pose} className="h-12 w-12" /></span>
                <span className="leading-tight"><span className="text-[10px] muted">{String(i + 1).padStart(2, "0")}</span><b className="block">{s.title}</b><span className="text-xs muted">{s.text}</span></span>
              </div>
            ))}
          </div>
        </div>

        {tip && (
          <div className="card-soft flex gap-3">
            <IconSparkles size={22} color="#351080" aria-hidden className="mt-0.5 shrink-0" />
            <div>
              <p className="eyebrow">Loopa coach {tip.source === "llm" ? "· AI" : ""}</p>
              <p className="text-sm">{tip.text}</p>
              <AiModelNote source={tip.source} model={tip.model} />
              {tip.source !== "llm" && (
                <button className="mt-1 text-xs underline" disabled={tipLoading} onClick={retryTip}>{tipLoading ? "Asking AI…" : "Try AI again"}</button>
              )}
            </div>
          </div>
        )}
        <button className="text-xs underline muted" onClick={() => setConfirmEnd(true)}>End session</button>
      </section>

      {confirmEnd && (
        <ConfirmModal text="End the session now? Your data is saved and you'll see your summary." onNo={() => setConfirmEnd(false)} onYes={() => void endAll()} />
      )}
    </div>
  );
}
