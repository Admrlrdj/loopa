"use client";
import { useEffect, useRef } from "react";
import { IconBellRingingFilled, IconChevronRight, IconCircleXFilled, IconSeedlingFilled } from "@tabler/icons-react";

function Modal({ title, eyebrow, icon, children }: { title: string; eyebrow: string; icon: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("button")?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(48,32,95,.45)", backdropFilter: "blur(4px)" }}
         role="alertdialog" aria-modal="true" aria-label={title}>
      <div ref={ref} className="w-full max-w-md space-y-4 rounded-3xl p-6 shadow-2xl" style={{ background: "#fffdf7" }}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "var(--accent)", color: "var(--brand)" }} aria-hidden>{icon}</div>
        <p className="text-xs font-semibold uppercase tracking-wide muted">{eyebrow}</p>
        <h2 className="text-2xl font-extrabold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Option({ label, hint, onClick, disabled, danger }: { label: string; hint: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl p-3 text-left disabled:opacity-50"
      style={{ background: danger ? "#ffe9ef" : "var(--panel)", color: danger ? "var(--danger)" : "var(--brand)" }}>
      <span><b className="block">{label}</b><span className="text-xs muted">{hint}</span></span>
      <IconChevronRight size={18} aria-hidden />
    </button>
  );
}

export function Alert1Modal({ onAck, soundBlocked }: { onAck: () => void; soundBlocked: boolean }) {
  return (
    <Modal icon={<IconBellRingingFilled size={26} />} eyebrow="Time to check in" title="Take a tiny pause">
      <p>We noticed signs that you might be sleepy. Your study session is still running. Try adjusting your posture or resting your eyes for a moment.</p>
      {soundBlocked && <p className="text-sm muted">Sound unavailable (blocked by the browser or turned off).</p>}
      <button className="btn btn-primary w-full" onClick={onAck}>Got it</button>
    </Modal>
  );
}

export function Alert2Modal({ onContinue, onEnd, busy, soundBlocked }: { onContinue: () => void; onEnd: () => void; busy: boolean; soundBlocked: boolean }) {
  return (
    <Modal icon={<IconBellRingingFilled size={26} />} eyebrow="Time to check in" title="Let's listen to your body">
      <p>Signs of drowsiness are still being detected. Would you like to keep studying or end the session now?</p>
      {soundBlocked && <p className="text-sm muted">Sound unavailable (blocked by the browser or turned off).</p>}
      <div className="space-y-2">
        <Option label="I'll do a quick reset" hint="Get a small suggestion before continuing" disabled={busy} onClick={onContinue} />
        <Option label="End my session" hint="Finish here and see my summary" disabled={busy} onClick={onEnd} danger />
      </div>
    </Modal>
  );
}

export function AdviceModal({ advice, onReady, busy }: { advice: string[]; onReady: () => void; busy: boolean }) {
  return (
    <Modal icon={<IconSeedlingFilled size={26} />} eyebrow="A mini reset" title="Before you get back to it">
      <ul className="list-disc space-y-1 pl-5">{advice.map((a) => <li key={a}>{a}</li>)}</ul>
      <p className="text-sm muted">Your timer is still paused. If you're very sleepy, resting is better than pushing through.</p>
      <button className="btn btn-primary w-full" disabled={busy} onClick={onReady}>I'm ready to continue</button>
    </Modal>
  );
}

export function ConfirmModal({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return (
    <Modal icon={<IconCircleXFilled size={26} />} eyebrow="Confirm" title="End session?">
      <p>{text}</p>
      <div className="flex gap-3">
        <button className="btn flex-1" onClick={onNo}>Cancel</button>
        <button className="btn btn-danger flex-1" onClick={onYes}>Yes, end it</button>
      </div>
    </Modal>
  );
}
