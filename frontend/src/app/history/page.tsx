"use client";
import { IconAlertCircleFilled, IconBook, IconClockHour3 } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { END_REASON_LABEL, hm } from "@/lib/format";
import type { Mood, SessionListItem } from "@/types/api";

const PAGE = 25;
const MOOD_LABEL: Record<Mood, string> = { good: "Good", okay: "Okay", tough: "Tough" };

export default function History() {
  const a = useRequireAuth();
  const [items, setItems] = useState<SessionListItem[] | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!a.ready) return;
    api.list(limit).then((r) => setItems(r.items)).catch((e) => setErr(e.message));
  }, [a.ready, a.user, limit]);

  if (!a.ready) return null;
  if (err) return <p style={{ color: "var(--danger)" }}>Could not load history: {err}</p>;
  if (!items) return <p className="muted">Loading…</p>;

  const focus = hm(items.reduce((n, i) => n + i.total_study_seconds, 0));
  const alerts = items.reduce((n, i) => n + i.alert_1_count + i.alert_2_count, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">History</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Sessions saved" value={items.length} hint="Every session matters" icon={<IconBook size={20} />} />
        <StatCard label="Total focus time" value={focus.value} unit={focus.unit} hint="Time spent showing up" icon={<IconClockHour3 size={20} />} />
        <StatCard label="Alerts recorded" value={alerts} hint="Gentle reminders along the way" icon={<IconAlertCircleFilled size={20} />} />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ borderColor: "var(--line)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead style={{ background: "var(--brand)", color: "#fff" }}>
              <tr>{["Session", "Date", "Focus", "Break", "Alerts", "Mood", "Ended"].map((h) => <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center muted">No sessions yet. Start one and it will show up here.</td></tr>}
              {items.map((i) => {
                const f = hm(i.total_study_seconds), b = hm(i.total_break_seconds);
                return (
                  <tr key={i.id} className="border-t hover:bg-[#faf7ff]" style={{ borderColor: "var(--line)" }}>
                    <td className="px-4 py-3 font-bold"><Link href={`/wrap?id=${i.id}`} className="hover:underline">{i.title}</Link></td>
                    <td className="px-4 py-3 muted">{new Date(i.started_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-4 py-3">{f.value} {f.unit}</td>
                    <td className="px-4 py-3">{b.value} {b.unit}</td>
                    <td className="px-4 py-3">{i.alert_1_count + i.alert_2_count}</td>
                    <td className="px-4 py-3">{i.reflection ? MOOD_LABEL[i.reflection] : <span className="muted">—</span>}</td>
                    <td className="px-4 py-3 muted">{i.end_reason ? END_REASON_LABEL[i.end_reason] ?? i.end_reason : i.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {items.length >= limit && <div className="text-center"><button className="btn" onClick={() => setLimit(limit + PAGE)}>Load more</button></div>}
    </div>
  );
}
