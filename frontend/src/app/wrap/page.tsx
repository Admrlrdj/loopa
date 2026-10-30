"use client";
import { IconAlertCircleFilled, IconChecklist, IconClockHour3, IconCoffee, IconHeart, IconPlayerPlayFilled } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CountsChart } from "@/components/charts/CountsChart";
import { AiModelNote } from "@/components/ui/AiModelNote";
import { MoodMonitor } from "@/components/ui/Illustrations";
import { StatCard } from "@/components/ui/StatCard";
import { api } from "@/lib/api";
import { ago, END_REASON_LONG, hm } from "@/lib/format";
import { stopMusic } from "@/lib/music";
import { saveRun } from "@/lib/run";
import type { InsightOut, Mood, SummaryOut } from "@/types/api";

const MOODS: { id: Mood; label: string }[] = [
  { id: "good", label: "Good" },
  { id: "okay", label: "Okay" },
  { id: "tough", label: "Tough" },
];

function WrapInner() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const [s, setS] = useState<SummaryOut | null>(null);
  const [insight, setInsight] = useState<InsightOut | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [insightDone, setInsightDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    saveRun(null); // rangkaian selesai
    stopMusic();
    api.summary(id).then((d) => { setS(d); setMood(d.reflection); }).catch((e) => setErr(e.message));
    api.insights(id).then(setInsight).catch(() => setInsight(null)).finally(() => setInsightDone(true)); // UI tetap jalan jika insight gagal
  }, [id]);

  function pick(m: Mood) {
    if (!id) return;
    setMood(m); // optimistik
    api.reflection(id, m).catch(() => setErr("Could not save your reflection. Please try again."));
  }

  if (!id) return <div className="page-wrap p-8"><p>No session ID. <Link className="underline" href="/setup">Start a new session</Link></p></div>;
  if (err && !s) return <div className="page-wrap p-8"><p style={{ color: "var(--danger)" }}>Could not load your summary: {err}</p><Link className="underline" href="/">Go home</Link></div>;
  if (!s) return <div className="page-wrap p-8"><p className="muted">Wrapping up your session…</p></div>;

  const focus = hm(s.total_study_seconds), brk = hm(s.total_break_seconds);
  const chart = [
    { name: "Blinks", value: s.blink_count }, { name: "Yawns", value: s.yawn_count },
    { name: "Long eye closures", value: s.eye_closure_count }, { name: "Alert 1", value: s.alert_1_count }, { name: "Alert 2", value: s.alert_2_count },
  ];

  return (
    <div className="page-wrap px-4 pb-14 pt-5 md:px-8">
      <header>
        <Link href="/" className="inline-flex flex-col" aria-label="Loopa home">
          <span className="flex items-center gap-2 text-3xl font-extrabold leading-none" style={{ color: "var(--brand)" }}>
            Loopa
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/loopa-mark.svg" alt="" width={36} height={32} />
          </span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest muted">Smart study companion</span>
        </Link>
      </header>

      <main className="mx-auto mt-4 max-w-3xl space-y-5">
        <div className="text-center">
          <p className="eyebrow inline-flex items-center gap-1.5">Session wrapped up<IconHeart size={13} color="#351080" aria-hidden /></p>
          <h1 className="text-4xl font-bold md:text-5xl">You did beyond great!</h1>
          <p className="mt-1 text-sm muted">Every little effort counts. Here&apos;s your session at a glance</p>
        </div>

        <section className="card flex items-center gap-4 !rounded-2xl shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: "var(--brand)" }}><IconChecklist size={22} aria-hidden /></span>
          <div className="flex-1 leading-tight">
            <p className="eyebrow">You worked on</p>
            <p className="text-lg font-bold">{s.title}</p>
            <p className="text-xs muted">{s.end_reason ? END_REASON_LONG[s.end_reason] ?? s.end_reason : "Session ended"}</p>
          </div>
          <span className="text-xs font-semibold">{ago(s.started_at)}</span>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard tint label="Total focus" value={focus.value} unit={focus.unit} hint="Time spent showing up" icon={<IconClockHour3 size={20} />} />
          <StatCard tint label="Drowsiness alerts" value={s.alert_1_count + s.alert_2_count} hint="Gentle reminders along the way" icon={<IconAlertCircleFilled size={20} />} />
          <StatCard tint label="Break time" value={brk.value} unit={brk.unit} hint="Time spent resting" icon={<IconCoffee size={20} />} />
        </div>

        <section className="card !rounded-2xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">A moment to reflect</p>
              <h2 className="text-xl font-bold">How did this session feel?</h2>
              <p className="text-xs muted">This is just for your own reflection. No right or wrong answer.</p>
            </div>
            <div className="flex gap-3" role="radiogroup" aria-label="How did this session feel?">
              {MOODS.map((m) => (
                <button key={m.id} role="radio" aria-checked={mood === m.id} onClick={() => pick(m.id)}
                        className="flex w-20 flex-col items-center gap-1 rounded-xl border-2 p-2 text-xs font-bold"
                        style={{ borderColor: mood === m.id ? "var(--brand)" : "var(--line)", background: mood === m.id ? "#f3ecff" : "#fff" }}>
                  <MoodMonitor mood={m.id} className="h-10 w-12" />{m.label}
                </button>
              ))}
            </div>
          </div>
          {err && <p role="alert" className="mt-2 text-xs" style={{ color: "var(--danger)" }}>{err}</p>}
        </section>

        <section className="card-soft space-y-1">
          <h2 className="font-bold">Recommendation {insight && <span className="text-xs font-normal muted">({insight.source === "llm" ? "AI coach" : "basic tips"})</span>}</h2>
          <p className="text-sm">{insight?.text ?? (insightDone ? "Recommendation unavailable right now." : "Writing your recommendation…")}</p>
          {insight && <AiModelNote source={insight.source} model={insight.model} />}
        </section>

        <details className="card !rounded-2xl">
          <summary className="cursor-pointer font-bold">Session details</summary>
          <div className="mt-3 space-y-4">
            <CountsChart data={chart} />
            <ul className="max-h-60 space-y-1 overflow-auto text-sm">
              {s.events.map((e) => (
                <li key={e.id} className="flex justify-between gap-3"><span>{e.event_type}</span><span className="muted">{new Date(e.timestamp).toLocaleTimeString("en-GB")}</span></li>
              ))}
            </ul>
          </div>
        </details>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button className="btn-push !w-auto px-8" onClick={() => router.push("/setup")}><IconPlayerPlayFilled size={16} aria-hidden />Start another session</button>
          <Link href="/history" className="btn-white !rounded-2xl !px-8 !py-3.5 shadow-sm">View history</Link>
        </div>
      </main>
    </div>
  );
}

export default function WrapPage() {
  return <Suspense fallback={null}><WrapInner /></Suspense>;
}
