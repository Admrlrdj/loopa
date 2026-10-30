// Ilustrasi SVG yang digambar ulang mengikuti desain Figma "loopa" (aset aslinya berupa banyak vektor lepas).
import type { Mood } from "@/types/api";

export function MugIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 330 230" className={className} role="img" aria-label="A warm cup of tea">
      <ellipse cx="165" cy="115" rx="165" ry="115" fill="#FFF34A" />
      <path d="M140 58c-12-14 12-22 0-38" stroke="#30205F" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M180 62c-12-14 12-22 0-38" stroke="#30205F" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <ellipse cx="158" cy="198" rx="104" ry="11" fill="#30205F" />
      <ellipse cx="158" cy="192" rx="96" ry="13" fill="#D4C4FF" />
      <path d="M222 104a30 30 0 1 1 0 62" stroke="#D4C4FF" strokeWidth="15" fill="none" strokeLinecap="round" />
      <path d="M94 96h128v52a48 48 0 0 1-48 48h-32a48 48 0 0 1-48-48z" fill="#7C5CF5" />
      <path d="M94 96h128v20H94z" fill="#6A4AE0" />
      <ellipse cx="158" cy="96" rx="64" ry="15" fill="#30205F" />
      <rect x="106" y="112" width="9" height="48" rx="4.5" fill="#B6A2FF" opacity=".75" />
      <path d="M262 62l4.5 11 11 4.5-11 4.5-4.5 11-4.5-11-11-4.5 11-4.5z" fill="#7C5CF5" />
    </svg>
  );
}

/** Tiga pose peregangan: "reach" (tangan ke atas), "shoulder" (putar bahu), "neck" (peregangan leher). */
export function StretchFigure({ pose, className }: { pose: "reach" | "shoulder" | "neck"; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={pose}>
      {pose === "reach" && (
        <g>
          <path d="M22 28l-6-18M42 28l6-18" stroke="#30205F" strokeWidth="5" strokeLinecap="round" />
          <path d="M14 14l2-5 3 4M50 14l-2-5-3 4" stroke="#30205F" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="32" cy="21" r="7" fill="#30205F" />
          <rect x="22" y="28" width="20" height="26" rx="9" fill="#7B61A8" />
        </g>
      )}
      {pose === "shoulder" && (
        <g>
          <path d="M18 34a9 9 0 0 1 8-9M46 34a9 9 0 0 0-8-9" stroke="#8B6BCF" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="32" cy="19" r="7" fill="#30205F" />
          <rect x="21" y="27" width="22" height="27" rx="10" fill="#7B61A8" />
          <path d="M23 33l-5 14M41 33l5 14" stroke="#30205F" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
      {pose === "neck" && (
        <g>
          <path d="M20 12a16 12 0 0 1 22 0" stroke="#D77FB0" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="37" cy="21" r="7" fill="#30205F" />
          <path d="M33 27l-3 4" stroke="#30205F" strokeWidth="4" strokeLinecap="round" />
          <rect x="21" y="29" width="22" height="25" rx="10" fill="#7B61A8" />
        </g>
      )}
    </svg>
  );
}

/** Maskot monitor Loopa dengan ekspresi sesuai mood (turunan dari logo/maskot Figma). */
export function MoodMonitor({ mood, className }: { mood: Mood; className?: string }) {
  const mouth = mood === "good" ? "M143 127c5 8 17 8 24 0" : mood === "okay" ? "M146 131h20" : "M143 135c5-8 17-8 24 0";
  return (
    <svg viewBox="66 44 178 125" className={className} role="img" aria-label={mood}>
      <path d="M120.9 166.3H86.4c-4.6 0-9-1.8-12.2-5-3.2-3.2-5-7.6-5-12.2V63.2c0-4.6 1.8-8.9 5-12.2 3.2-3.2 7.6-5 12.2-5h137.9c4.6 0 9 1.8 12.2 5 3.2 3.2 5 7.6 5 12.2v85.9c0 4.6-1.8 9-5 12.2-3.2 3.2-7.6 5-12.2 5h-34.5H120.9z" fill="#351080" />
      <rect x="91.3" y="68.1" width="128.8" height="75.2" rx="2.4" fill="#D4C4FF" />
      <ellipse cx="135.4" cy="101.3" rx="13.2" ry={mood === "tough" ? 17 : 21.8} fill="#fff" />
      <ellipse cx="172.3" cy="100" rx="14.5" ry={mood === "tough" ? 18 : 23.1} fill="#fff" />
      <ellipse cx="138.7" cy="104" rx="5.9" ry="12.5" fill="#351080" />
      <ellipse cx="175" cy="102" rx="6.6" ry="13.2" fill="#351080" />
      <path d={mouth} stroke="#351080" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {mood === "tough" && <path d="M205 80c3 5 5 8 0 12-5-4-3-7 0-12z" fill="#7C5CF5" />}
    </svg>
  );
}
