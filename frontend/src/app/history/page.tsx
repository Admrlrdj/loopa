"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { END_REASON_LABEL, minutes } from "@/lib/format";
import type { SessionListItem } from "@/types/api";

export default function History() {
  const [items, setItems] = useState<SessionListItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.list(30).then((r) => setItems(r.items)).catch((e) => setErr(e.message)); }, []);

  if (err) return <p className="text-[#b4234f]">Could not load history: {err}</p>;
  if (!items) return <p className="muted">Loading…</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Session history</h1>
      {items.length === 0 && <p className="muted">No sessions yet.</p>}
      {items.map((i) => (
        <Link key={i.id} href={`/summary?id=${i.id}`} className="card block hover:brightness-95">
          <div className="flex justify-between">
            <b>{new Date(i.started_at).toLocaleString("en-GB")}</b>
            <span className="text-sm muted">{i.end_reason ? END_REASON_LABEL[i.end_reason] ?? i.end_reason : i.status}</span>
          </div>
          <p className="text-sm muted">
            Study {minutes(i.total_study_seconds)} · Break {minutes(i.total_break_seconds)} · Alert {i.alert_1_count}/{i.alert_2_count} ·
            Blinks {i.blink_count} · Yawns {i.yawn_count}
          </p>
        </Link>
      ))}
    </div>
  );
}
