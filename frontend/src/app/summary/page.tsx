"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { saveRun } from "@/lib/run";
import { END_REASON_LABEL, minutes } from "@/lib/format";
import { CountsChart } from "@/components/charts/CountsChart";
import { AiModelNote } from "@/components/ui/AiModelNote";
import type { InsightOut, SummaryOut } from "@/types/api";

function SummaryInner() {
  const id = useSearchParams().get("id");
  const [s, setS] = useState<SummaryOut | null>(null);
  const [insight, setInsight] = useState<InsightOut | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    saveRun(null); // rangkaian selesai
    api.summary(id).then(setS).catch((e) => setErr(e.message));
    api.insights(id).then(setInsight).catch(() => setInsight(null)); // UI tetap jalan jika insight gagal
  }, [id]);

  if (!id) return <p>No session ID. <Link className="underline" href="/setup">Start a new session</Link></p>;
  if (err) return <p className="text-[#b4234f]">Could not load summary: {err}</p>;
  if (!s) return <p className="muted">Loading summary…</p>;

  const chart = [
    { name: "Blinks", value: s.blink_count }, { name: "Yawns", value: s.yawn_count },
    { name: "Long eye closures", value: s.eye_closure_count }, { name: "Alert 1", value: s.alert_1_count }, { name: "Alert 2", value: s.alert_2_count },
  ];
  const stat = (label: string, v: string | number) => (
    <div className="card"><p className="text-sm muted">{label}</p><p className="text-2xl font-bold">{v}</p></div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Session summary</h1>
      <p className="muted">Ended: {s.end_reason ? END_REASON_LABEL[s.end_reason] ?? s.end_reason : "—"}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat("Study time", minutes(s.total_study_seconds))}
        {stat("Break time", minutes(s.total_break_seconds))}
        {stat("Blocks completed", s.blocks_completed)}
        {stat("Blocks stopped early", s.blocks_stopped_early)}
        {stat("Estimated drowsy time", minutes(s.estimated_drowsy_seconds))}
        {stat("Paused time", minutes(s.total_pause_seconds))}
        {stat("Alert 1", s.alert_1_count)}
        {stat("Alert 2", s.alert_2_count)}
      </div>
      <div className="card"><h2 className="mb-2 font-semibold">Indicators</h2><CountsChart data={chart} /></div>
      <div className="card space-y-1">
        <h2 className="font-semibold">Recommendation {insight && <span className="text-xs muted">({insight.source === "llm" ? "AI coach" : "basic tips"})</span>}</h2>
        <p>{insight?.text ?? "Recommendation unavailable right now."}</p>
        {insight && <AiModelNote source={insight.source} model={insight.model} />}
      </div>
      <div className="card">
        <h2 className="mb-2 font-semibold">Event timeline</h2>
        <ul className="max-h-72 space-y-1 overflow-auto text-sm">
          {s.events.map((e) => (
            <li key={e.id} className="flex justify-between gap-3">
              <span>{e.event_type}</span>
              <span className="muted">{new Date(e.timestamp).toLocaleTimeString("en-GB")}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-3">
        <Link href="/setup" className="btn btn-primary">New session</Link>
        <Link href="/history" className="btn">History</Link>
      </div>
    </div>
  );
}

export default function SummaryPage() {
  return <Suspense fallback={<p className="muted">Loading…</p>}><SummaryInner /></Suspense>;
}
