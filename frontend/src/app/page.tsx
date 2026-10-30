"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBook, IconCalendar, IconChevronRight, IconClockHour3, IconEye, IconPlayerPlayFilled } from "@tabler/icons-react";
import { api } from "@/lib/api";
import { END_REASON_LABEL, minutes } from "@/lib/format";
import type { SessionListItem } from "@/types/api";

export default function Home() {
  const [backend, setBackend] = useState<string>("checking…");
  const [aiInfo, setAiInfo] = useState<string>("");
  const [items, setItems] = useState<SessionListItem[]>([]);
  useEffect(() => {
    api.health()
      .then((h) => { setAiInfo(h.llm ? (h.llm.enabled ? `${h.llm.model}${h.llm.fallbacks.length ? ` (backup: ${h.llm.fallbacks.join(", ")})` : ""}` : "off (no API key)") : "unknown"); return h; })
      .then((h) => setBackend(`connected (inference: ${h.inference_backend}, database: ${h.persistence ? "on" : "in-memory"})`))
      .catch(() => setBackend("not connected — start the backend on port 8000"));
    api.list(5).then((r) => setItems(r.items)).catch(() => {});
  }, []);

  const totalStudy = items.reduce((a, i) => a + i.total_study_seconds, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Hello, Loopers!</h1>
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
            <p className="text-3xl font-bold">{minutes(totalStudy)}</p>
            <p className="text-sm">Last {items.length} sessions</p>
          </div>
        </div>
        <div className="card-brand flex gap-4">
          <IconCalendar size={32} stroke={1.6} aria-hidden />
          <div>
            <p className="text-sm">Study sessions</p>
            <p className="text-3xl font-bold">{items.length}</p>
            <p className="text-sm">Recent</p>
          </div>
        </div>
      </div>

      <section className="card-soft flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: "var(--brand)" }}><IconEye size={24} aria-hidden /></span>
        <div className="flex-1">
          <h2 className="font-bold">Your study rhythm</h2>
          <p className="text-sm muted">You&apos;re doing great! Keep taking breaks and listening to your body&apos;s signals.</p>
        </div>
        <IconChevronRight aria-hidden />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Recent Sessions</h2>
          <Link href="/history" className="text-sm font-semibold">View all</Link>
        </div>
        {items.length === 0 && <p className="muted text-sm">No sessions yet.</p>}
        {items.map((i) => (
          <Link key={i.id} href={`/summary?id=${i.id}`} className="card flex items-center gap-3 !rounded-2xl !p-3 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ background: "var(--brand)" }}><IconBook size={20} aria-hidden /></span>
            <span className="flex-1">
              <b className="block text-sm">Study Session</b>
              <span className="text-xs muted">
                {new Date(i.started_at).toLocaleString("en-GB")} · {minutes(i.total_study_seconds)} · {i.end_reason ? END_REASON_LABEL[i.end_reason] ?? i.end_reason : i.status}
              </span>
            </span>
            <IconChevronRight size={18} aria-hidden />
          </Link>
        ))}
      </section>
      <p className="text-xs muted">Backend status: {backend}</p>
      <p className="text-[11px] muted">[temp] AI model: {aiInfo || "checking…"}</p>
    </div>
  );
}
