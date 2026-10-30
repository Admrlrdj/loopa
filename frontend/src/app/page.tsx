"use client";
import { IconBook, IconCalendar, IconChevronRight, IconClockHour3, IconEye, IconPlayerPlayFilled } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { END_REASON_LABEL, minutes } from "@/lib/format";
import type { HealthOut, SessionListItem, StatsOut } from "@/types/api";

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function Home() {
  const a = useRequireAuth();
  const [health, setHealth] = useState<HealthOut | null>(null);
  const [down, setDown] = useState(false);
  const [items, setItems] = useState<SessionListItem[]>([]);
  const [stats, setStats] = useState<StatsOut | null>(null);

  useEffect(() => { api.health().then(setHealth).catch(() => setDown(true)); }, []);
  useEffect(() => {
    if (!a.ready) return;
    api.list(4).then((r) => setItems(r.items)).catch(() => {});
    api.stats(7).then(setStats).catch(() => {});
  }, [a.ready, a.user]);

  if (!a.ready) return null;
  const name = a.user || a.guest ? a.displayName : "Loopers";
  const backend = down ? "not connected — start the backend on port 8000"
    : health ? `connected (inference: ${health.inference_backend}, database: ${health.persistence ? "on" : "in-memory"}, login: ${health.auth?.enabled ? "on" : "off"})` : "checking…";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Hello, {name}!</h1>
        <p className="muted text-sm">A little progress is still progress. Let&apos;s make this session count!</p>
      </div>

      <section className="card-accent flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <div>
            <h2 className="text-3xl font-bold">Time to focus</h2>
            <p className="font-medium">Study at your own rhythm</p>
          </div>
          <Link href="/setup" className="btn btn-primary"><IconPlayerPlayFilled size={16} aria-hidden />Start session</Link>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/mascot.svg" alt="Loopa mascot" className="w-40 md:w-56" />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-brand flex gap-4">
          <IconClockHour3 size={32} stroke={1.6} aria-hidden />
          <div>
            <p className="text-sm">Total focus time</p>
            <p className="text-3xl font-bold">{minutes(stats?.total_focus_seconds ?? 0)}</p>
            <p className="text-sm">This week</p>
          </div>
        </div>
        <div className="card-brand flex gap-4">
          <IconCalendar size={32} stroke={1.6} aria-hidden />
          <div>
            <p className="text-sm">Study sessions</p>
            <p className="text-3xl font-bold">{stats?.sessions ?? 0}</p>
            <p className="text-sm">This week</p>
          </div>
        </div>
      </div>

      <Link href="/statistics" className="card-soft flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: "var(--brand)" }}><IconEye size={24} aria-hidden /></span>
        <div className="flex-1">
          <h2 className="font-bold">Your study rhythm</h2>
          <p className="text-sm muted">{stats?.insight ?? "You're doing great! Keep taking breaks and listening to your body's signals."}</p>
        </div>
        <IconChevronRight aria-hidden />
      </Link>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Recent Sessions</h2>
          <Link href="/history" className="text-sm font-semibold">View all</Link>
        </div>
        {items.length === 0 && <p className="muted text-sm">No sessions yet.</p>}
        {items.map((i) => (
          <Link key={i.id} href={`/wrap?id=${i.id}`} className="card flex items-center gap-3 !rounded-2xl !p-3 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ background: "var(--brand)" }}><IconBook size={20} aria-hidden /></span>
            <span className="flex-1">
              <b className="block text-sm">{i.title}</b>
              <span className="text-xs muted">
                {ago(i.started_at)} · {minutes(i.total_study_seconds)} · {i.end_reason ? END_REASON_LABEL[i.end_reason] ?? i.end_reason : i.status}
              </span>
            </span>
            <IconChevronRight size={18} aria-hidden />
          </Link>
        ))}
      </section>
      <p className="text-xs muted">Backend status: {backend}</p>
      <p className="text-[11px] muted">[temp] AI model: {health?.llm ? (health.llm.enabled ? health.llm.model : "off (no API key)") : "checking…"}</p>
    </div>
  );
}
