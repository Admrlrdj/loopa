// Bunyi alert lewat WebAudio (tanpa berkas). Browser bisa memblokir sampai ada interaksi pengguna.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    return ctx;
  } catch { return null; }
}

/** Panggil dari handler klik untuk membuka izin audio. */
export async function unlockAudio(): Promise<boolean> {
  const c = getCtx(); if (!c) return false;
  try { if (c.state === "suspended") await c.resume(); } catch { return false; }
  return c.state === "running";
}

export async function playAlert(level: 1 | 2 = 1): Promise<boolean> {
  const c = getCtx(); if (!c) return false;
  try { if (c.state === "suspended") await c.resume(); } catch { return false; }
  if (c.state !== "running") return false;
  const beeps = level === 1 ? 2 : 3;
  for (let i = 0; i < beeps; i++) {
    const t = c.currentTime + i * 0.35;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = "sine"; o.frequency.value = level === 1 ? 660 : 880;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.3);
  }
  return true;
}
