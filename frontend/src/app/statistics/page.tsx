"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { minutes } from "@/lib/format";
import { CountsChart } from "@/components/charts/CountsChart";
import type { SessionListItem } from "@/types/api";

export default function Statistics() {
  const [items, setItems] = useState<SessionListItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.list(100).then((r) => setItems(r.items)).catch((e) => setErr(e.message)); }, []);

  if (err) return <p className="text-[#b4234f]">Could not load statistics: {err}</p>;
  if (!items) return <p className="muted">Loading…</p>;

  const sum = (f: (i: SessionListItem) => number) => items.reduce((a, i) => a + f(i), 0);
  const stat = (label: string, v: string | number) => (
    <div className="card"><p className="text-sm muted">{label}</p><p className="text-3xl font-extrabold">{v}</p></div>
  );
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Statistics</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {stat("Sessions saved", items.length)}
        {stat("Total focus time", minutes(sum((i) => i.total_study_seconds)))}
        {stat("Alerts recorded", sum((i) => i.alert_1_count + i.alert_2_count))}
      </div>
      <div className="card">
        <h2 className="mb-2 font-bold">Overall indicators</h2>
        <CountsChart data={[
          { name: "Blinks", value: sum((i) => i.blink_count) },
          { name: "Yawns", value: sum((i) => i.yawn_count) },
          { name: "Long eye closures", value: sum((i) => i.eye_closure_count) },
          { name: "Alert 1", value: sum((i) => i.alert_1_count) },
          { name: "Alert 2", value: sum((i) => i.alert_2_count) },
        ]} />
      </div>
    </div>
  );
}
