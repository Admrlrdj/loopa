"use client";
import { IconX } from "@tabler/icons-react";
import { useEffect, useRef } from "react";

/** Modal ala Figma: kartu krem, ikon di tile kuning, eyebrow + judul. Fokus awal dikelola; Esc memanggil onClose bila ada. */
export function Modal({ title, eyebrow, icon, children, onClose, wide }: {
  title: string; eyebrow?: string; icon?: React.ReactNode; children: React.ReactNode; onClose?: () => void; wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, input, select")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
      if (e.key === "Tab" && ref.current) { // focus trap sederhana
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>("button, input, select, a[href], [tabindex]:not([tabindex='-1'])")).filter((x) => !x.hasAttribute("disabled"));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4" style={{ background: "rgba(48,32,95,.45)", backdropFilter: "blur(5px)" }}
         role="dialog" aria-modal="true" aria-label={title}>
      <div ref={ref} className={`relative my-auto w-full space-y-4 rounded-[28px] p-7 shadow-2xl ${wide ? "max-w-xl" : "max-w-md"}`} style={{ background: "var(--cream)" }}>
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl border bg-white" style={{ borderColor: "var(--line)" }}>
            <IconX size={18} />
          </button>
        )}
        {icon && <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--accent)", color: "var(--btn)" }} aria-hidden>{icon}</div>}
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="text-3xl font-bold leading-tight">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}
