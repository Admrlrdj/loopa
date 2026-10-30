"use client";
import { IconAlertCircleFilled, IconBook, IconClockHour3, IconEye } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/ui/StatCard";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { hm } from "@/lib/format";
import type { StatsOut } from "@/types/api";

const RANGES = [7, 14, 30] as const;

export default function Statistics() {
  const a = useRequireAuth();
  const [days, setDays] = useState<number>(14);
  const [st, setSt] = useState<StatsOut | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!a.ready) return;
    setSt(null);
    api.stats(days).then(setSt).catch((e) => setErr(e.message));
  }, [a.ready, a.user, days]);

  if (!a.ready) return null;
  if (err) return <p style={{ color: "var(--danger)" }}>Could not load statistics: {err}</p>;
  if (!st) return <p className="muted">Loading…</p>;

  const focus = hm(st.total_focus_seconds);
  const data = st.per_day.map((d) => ({ name: new Date(d.date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), minutes: d.focus_minutes, sessions: d.sessions }));
  const moods = [["good", "Good"], ["okay", "Okay"], ["tough", "Tough"]] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Statistics</h1>
        <div className="flex gap-1 rounded-full p-1" style={{ background: "var(--panel)" }} role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setDays(r)} aria-pressed={days === r} className="rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={days === r ? { background: "var(--brand)", color: "#fff" } : undefined}>{r} days</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Sessions saved" value={st.sessions} hint="Every session matters" icon={<IconBook size={20} />} />
        <StatCard label="Total focus time" value={focus.value} unit={focus.unit} hint="Time spent showing up" icon={<IconClockHour3 size={20} />} />
        <StatCard label="Alerts recorded" value={st.alerts} hint="Gentle reminders along the way" icon={<IconAlertCircleFilled size={20} />} />
      </div>

      <section className="card !rounded-2xl shadow-sm">
        <h2 className="mb-1 font-bold">Study minutes per day</h2>
        <p className="mb-3 text-xs muted">Time with the timer running, last {st.days} days (UTC dates).</p>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1d8f5" vertical={false} />
              <XAxis dataKey="name" fontSize={11} interval={days > 14 ? 3 : 0} tickLine={false} />
              <YAxis fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => [`${v} min`, "Study time"]} />
              <Bar dataKey="minutes" fill="#351080" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card-soft flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white" style={{ background: "var(--brand)" }}><IconEye size={24} aria-hidden /></span>
        <div><h2 className="font-bold">Your study rhythm</h2><p className="text-sm muted">{st.insight}</p></div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card !rounded-2xl"><p className="eyebrow">Day streak</p><p className="text-3xl font-bold">{st.current_streak_days}</p><p className="text-xs muted">days in a row</p></div>
        <div className="card !rounded-2xl"><p className="eyebrow">Average session</p><p className="text-3xl font-bold">{st.avg_session_minutes}<span className="ml-1 text-sm font-medium muted">min</span></p></div>
        <div className="card !rounded-2xl"><p className="eyebrow">Drowsiness signs</p><p className="text-3xl font-bold">{st.drowsy_share_pct}<span className="ml-1 text-sm font-medium muted">%</span></p><p className="text-xs muted">of study time (indication)</p></div>
        <div className="card !rounded-2xl">
          <p className="eyebrow">How sessions felt</p>
          <p className="mt-1 text-sm">{moods.map(([k, l]) => `${l} ${st.mood_counts[k] ?? 0}`).join(" · ")}</p>
        </div>
      </div>
    </div>
  );
}
