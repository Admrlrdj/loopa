"use client";
import { useEffect, useRef } from "react";
import { getBars } from "@/lib/music";

const N = 36;
const IDLE = Array.from({ length: N }, (_, i) => 0.18 + 0.12 * Math.abs(Math.sin(i * 0.9)));

/** Batang waveform bergerak mengikuti musik (analyser); diam dengan pola lembut saat musik mati. */
export function Waveform({ playing }: { playing: boolean }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const bars = playing ? getBars(N) : IDLE;
      refs.current.forEach((el, i) => { if (el) el.style.height = `${Math.max(10, (bars[i] ?? 0.1) * 100)}%`; });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return (
    <div className="flex h-10 items-center justify-center gap-[3px]" aria-hidden>
      {Array.from({ length: N }, (_, i) => (
        <span key={i} ref={(el) => { refs.current[i] = el; }} className="w-[3px] rounded-full" style={{ background: "#8b6bcf", height: "20%", transition: "height .08s" }} />
      ))}
    </div>
  );
}
