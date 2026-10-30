"use client";
import { IconBellRingingFilled, IconChevronRight, IconCircleXFilled, IconCoffee } from "@tabler/icons-react";
import { Modal } from "@/components/ui/Modal";

function Option({ label, hint, onClick, disabled, danger }: { label: string; hint: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl p-3.5 text-left disabled:opacity-50"
      style={{ background: danger ? "#ffe9ef" : "var(--panel)", color: danger ? "var(--danger)" : "var(--brand)" }}>
      <span><b className="block">{label}</b><span className="text-xs muted">{hint}</span></span>
      <IconChevronRight size={18} aria-hidden />
    </button>
  );
}

export function Alert1Modal({ onAck, soundBlocked }: { onAck: () => void; soundBlocked: boolean }) {
  return (
    <Modal icon={<IconBellRingingFilled size={28} />} eyebrow="Time to check in" title="Take a tiny pause">
      <p className="muted">We noticed signs that you might be sleepy. Your study session is still running. Try adjusting your posture or resting your eyes for a moment.</p>
      {soundBlocked && <p className="text-sm muted">Sound unavailable (blocked by the browser or turned off).</p>}
      <button className="btn-push" onClick={onAck}>Got it</button>
    </Modal>
  );
}

export function Alert2Modal({ onContinue, onEnd, busy, soundBlocked }: { onContinue: () => void; onEnd: () => void; busy: boolean; soundBlocked: boolean }) {
  return (
    <Modal icon={<IconBellRingingFilled size={28} />} eyebrow="Time to check in" title="Let's listen to your body">
      <p className="muted">Signs of drowsiness are still being detected. Would you like to keep studying or end the session now?</p>
      {soundBlocked && <p className="text-sm muted">Sound unavailable (blocked by the browser or turned off).</p>}
      <div className="space-y-2">
        <Option label="I'll do a quick reset" hint="Get a small suggestion before continuing" disabled={busy} onClick={onContinue} />
        <Option label="End my session" hint="Finish here and see my summary" disabled={busy} onClick={onEnd} danger />
      </div>
    </Modal>
  );
}

const STEP_HINTS = ["Reach your arms up gently for 20 seconds", "Take a few slow sips", "Look at something far away for 20 seconds"];

/** "Take a tiny pause" (Figma): tiga langkah ringan, lalu lanjut belajar atau langsung istirahat. */
export function AdviceModal({ advice, onReady, onBreak, busy, breakMinutes }: {
  advice: string[]; onReady: () => void; onBreak: () => void; busy: boolean; breakMinutes: number;
}) {
  const steps = advice.slice(0, 3);
  return (
    <Modal icon={<IconCoffee size={28} />} eyebrow="A mini reset" title="Take a tiny pause" wide>
      <p className="muted">Before you get back to it, try one of these small resets. Resting is better than pushing through when you&apos;re very sleepy.</p>
      <ol className="space-y-3">
        {steps.map((a, i) => (
          <li key={a} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold" style={{ background: "var(--accent)", color: "var(--brand)" }}>{String(i + 1).padStart(2, "0")}</span>
            <span><b className="block text-sm">{a.replace(/\.$/, "")}</b><span className="text-xs muted">{STEP_HINTS[i]}</span></span>
          </li>
        ))}
      </ol>
      <p className="text-xs muted">Your timer is still paused.</p>
      <div className="space-y-2">
        <button className="btn-push" disabled={busy} onClick={onBreak}>Start a {breakMinutes}-min break</button>
        <button className="btn w-full !rounded-2xl" disabled={busy} onClick={onReady}>I&apos;m ready to continue</button>
      </div>
    </Modal>
  );
}

export function ConfirmModal({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return (
    <Modal icon={<IconCircleXFilled size={28} />} eyebrow="Confirm" title="End session?" onClose={onNo}>
      <p className="muted">{text}</p>
      <div className="flex gap-3">
        <button className="btn flex-1 !rounded-xl" onClick={onNo}>Cancel</button>
        <button className="btn btn-danger flex-1 !rounded-xl" onClick={onYes}>Yes, end it</button>
      </div>
    </Modal>
  );
}
