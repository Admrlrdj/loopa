"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconCheck, IconMug, IconSeedlingFilled, IconSparkles } from "@tabler/icons-react";
import type { InsightOut } from "@/types/api";
import { AiModelNote } from "@/components/ui/AiModelNote";
import { api, ApiError } from "@/lib/api";
import { loadRun, patchRun, saveRun, type Run } from "@/lib/run";
import { mmss } from "@/lib/format";
import { useCountdown } from "@/hooks/useCountdown";

type Phase = "ready" | "running" | "done";

export default function BreakPage() {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const completed = useRef(false);
  const [tip, setTip] = useState<InsightOut | null>(null);
  const tipAsked = useRef(false);
  const [tipLoading, setTipLoading] = useState(false);
  const [lost, setLost] = useState(false); // sesi hilang di server (mis. backend restart)

  useEffect(() => {
    const r = loadRun();
    if (!r) { router.replace("/setup"); return; }
    setRun(r);
    if (!tipAsked.current) { // satu tip per kunjungan; gagal = tidak tampil
      tipAsked.current = true;
      api.breakTip(r.sessionId).then(setTip).catch(() => setTip(null));
    }
    if (r.breakId && r.breakStartedAt) setPhase("running"); // pulih setelah refresh
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

  async function startBreak() {
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
  }
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
    router.push(`/summary?id=${run.sessionId}`);
  }
  function nextBlock() { router.push("/session"); } // kamera diminta lagi lewat tindakan pengguna ini

  if (lost) {
    return (
      <div className="card mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-bold">This session is no longer available</h1>
        <p className="muted">The server no longer has this session (it may have restarted or ended). Your progress on the server was lost, but you can start a new one.</p>
        <div className="flex gap-3">
          <button className="btn btn-primary flex-1" onClick={() => { saveRun(null); router.push("/setup"); }}>Start a new session</button>
          <button className="btn flex-1" onClick={() => { saveRun(null); router.push("/"); }}>Go home</button>
        </div>
      </div>
    );
  }
  if (!run) return null;
  return (
    <div className="card mx-auto max-w-lg space-y-5 text-center">
      {phase === "ready" && (
        <>
          <IconSeedlingFilled className="mx-auto" size={40} color="#351080" aria-hidden />
          <h1 className="text-3xl font-bold">Study time is up</h1>
          <p className="muted">Camera monitoring has stopped. Start your {Math.round(run.breakSeconds / 60)}-minute break?</p>
          <div className="flex gap-3">
            <button className="btn btn-primary flex-1" disabled={busy} onClick={startBreak}>Start break</button>
            <button className="btn flex-1" disabled={busy} onClick={endAll}>Finish</button>
          </div>
        </>
      )}
      {phase === "running" && (
        <>
          <IconMug className="mx-auto" size={40} color="#351080" aria-hidden />
          <h1 className="text-3xl font-bold">Break</h1>
          <p className="text-7xl font-bold tabular-nums">{mmss(remaining)}</p>
          <p className="text-sm muted">The camera is off during your break.</p>
          <div className="flex gap-3">
            <button className="btn flex-1" onClick={finish}>End break</button>
            <button className="btn btn-danger flex-1" disabled={busy} onClick={endAll}>End session</button>
          </div>
        </>
      )}
      {phase === "done" && (
        <>
          <IconCheck className="mx-auto" size={40} color="#351080" aria-hidden />
          <h1 className="text-3xl font-bold">Break is over</h1>
          <p className="muted">Ready to continue? The camera will not turn on automatically.</p>
          <div className="flex gap-3">
            <button className="btn btn-primary flex-1" onClick={nextBlock}>Next study session</button>
            <button className="btn flex-1" disabled={busy} onClick={endAll}>Finish</button>
          </div>
        </>
      )}
      {tip && (
        <div className="card-soft flex gap-3 text-left">
          <IconSparkles size={22} color="#351080" aria-hidden className="mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide muted">Loopa coach {tip.source === "llm" ? "· AI" : ""}</p>
            <p className="text-sm">{tip.text}</p>
            <AiModelNote source={tip.source} model={tip.model} />
            {tip.source !== "llm" && (
              <button className="mt-1 text-xs underline" disabled={tipLoading} onClick={retryTip}>{tipLoading ? "Asking AI…" : "Try AI again"}</button>
            )}
          </div>
        </div>
      )}
      {err && <p className="text-sm text-[#b4234f]">{err}</p>}
    </div>
  );
}
