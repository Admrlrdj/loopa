"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Countdown berbasis timestamp (bukan jumlah tick), jadi tetap akurat saat tab di background.
 * Sisa waktu = total - (sekarang - startedAt - total jeda). Saat pausedSince terisi, waktu dibekukan.
 */
export function useCountdown(
  totalSeconds: number,
  startedAt: number | null,
  pausedMs: number,
  pausedSince: number | null,
  onDone: () => void,
) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const doneRef = useRef(false);
  const cb = useRef(onDone);
  cb.current = onDone;

  useEffect(() => { doneRef.current = false; }, [startedAt, totalSeconds]);

  useEffect(() => {
    if (startedAt == null) { setRemaining(totalSeconds); return; }
    const tick = () => {
      const now = pausedSince ?? Date.now();
      const left = totalSeconds - (now - startedAt - pausedMs) / 1000;
      setRemaining(Math.max(0, left));
      if (left <= 0 && !doneRef.current && pausedSince == null) { doneRef.current = true; cb.current(); }
    };
    tick();
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [totalSeconds, startedAt, pausedMs, pausedSince]);

  return remaining;
}
