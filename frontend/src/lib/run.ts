// Status rangkaian Pomodoro yang berjalan, disimpan di sessionStorage agar refresh tidak menghilangkan sesi.
export interface Run {
  sessionId: string;
  studySeconds: number;
  breakSeconds: number;
  blockId?: string;
  blockSeq?: number;
  blockStartedAt?: number; // epoch ms
  pausedMs?: number; // total jeda terakumulasi
  pausedSince?: number | null;
  breakId?: string;
  breakStartedAt?: number;
  soundOn: boolean;
  title?: string;
  mandatoryBreak?: boolean;
  soundtrack?: string | null;
  musicOn?: boolean;
  noCamera?: boolean; // dipilih "Start without camera": timer saja
}
const KEY = "sss_run";

export function loadRun(): Run | null {
  try { const v = sessionStorage.getItem(KEY); return v ? (JSON.parse(v) as Run) : null; } catch { return null; }
}
export function saveRun(r: Run | null) {
  try { if (r) sessionStorage.setItem(KEY, JSON.stringify(r)); else sessionStorage.removeItem(KEY); } catch { /* storage diblokir */ }
}
export function patchRun(p: Partial<Run>): Run | null {
  const r = loadRun(); if (!r) return null;
  const n = { ...r, ...p }; saveRun(n); return n;
}
