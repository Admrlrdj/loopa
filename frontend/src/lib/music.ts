// Musik latar generatif (WebAudio, tanpa berkas audio dan tanpa lisensi pihak ketiga).
// Singleton di level modul: tetap berjalan saat berpindah halaman (SPA). Browser mewajibkan interaksi pengguna
// sebelum audio boleh bunyi, jadi startMusic() dipanggil dari handler klik.
//
// "Energized": saat indikasi kantuk muncul, musik dibuat sedikit lebih cerah dan rapat (nada lebih sering, oktaf atas,
// volume naik). Ini rancangan UX, bukan intervensi yang terbukti secara klinis, dan bukan pengganti istirahat.

export type TrackId = "soft-piano" | "gentle-rain" | "brown-noise" | "ocean-waves";

export const TRACKS: { id: TrackId; name: string; hint: string }[] = [
  { id: "soft-piano", name: "Soft Piano", hint: "Soft instrumental" },
  { id: "gentle-rain", name: "Gentle Rain", hint: "Rain and distant rumble" },
  { id: "brown-noise", name: "Brown Noise", hint: "Deep steady hum" },
  { id: "ocean-waves", name: "Ocean Waves", hint: "Slow rolling waves" },
];

export interface MusicState { playing: boolean; track: TrackId; volume: number; energized: boolean }

const PREF_KEY = "loopa_music";
let state: MusicState = { playing: false, track: "soft-piano", volume: 0.5, energized: false };
const listeners = new Set<() => void>();

function emit() { state = { ...state }; listeners.forEach((l) => l()); }
function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ track: state.track, volume: state.volume })); } catch { /* */ }
}
function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? "null");
    if (p && TRACKS.some((t) => t.id === p.track)) state = { ...state, track: p.track, volume: Math.min(Math.max(Number(p.volume) || 0.5, 0), 1) };
  } catch { /* */ }
}
if (typeof window !== "undefined") loadPrefs();

export const getMusicState = () => state;
export function subscribeMusic(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let active: { stop: () => void } | null = null;
let duckFactor = 1;
let duckTimer: ReturnType<typeof setTimeout> | null = null;

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    master.connect(analyser);
    analyser.connect(ctx.destination);
    return ctx;
  } catch { return null; }
}

function targetGain(): number {
  return state.volume * (state.energized ? 1.2 : 1) * duckFactor * 0.8;
}
function applyGain(timeConstant = 0.15) {
  if (ctx && master) master.gain.setTargetAtTime(state.playing ? targetGain() : 0, ctx.currentTime, timeConstant);
}

function noiseBuffer(c: AudioContext, kind: "white" | "brown", seconds = 4): AudioBuffer {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === "white") d[i] = w;
    else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  }
  return buf;
}
function loopSource(c: AudioContext, kind: "white" | "brown") {
  const s = c.createBufferSource();
  s.buffer = noiseBuffer(c, kind);
  s.loop = true;
  s.start();
  return s;
}

type Gen = { stop: () => void };

function genBrown(c: AudioContext, out: AudioNode): Gen {
  const src = loopSource(c, "brown");
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
  const g = c.createGain(); g.gain.value = 0.9;
  src.connect(lp).connect(g).connect(out);
  return { stop: () => { try { src.stop(); } catch { /* */ } g.disconnect(); } };
}

function genOcean(c: AudioContext, out: AudioNode): Gen {
  const src = loopSource(c, "brown");
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100;
  const swell = c.createGain(); swell.gain.value = 0.55;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.11;
  const depth = c.createGain(); depth.gain.value = 0.4;
  lfo.connect(depth).connect(swell.gain);
  lfo.start();
  src.connect(lp).connect(swell).connect(out);
  return { stop: () => { try { src.stop(); lfo.stop(); } catch { /* */ } swell.disconnect(); } };
}

function genRain(c: AudioContext, out: AudioNode): Gen {
  const white = loopSource(c, "white");
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 700;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 7000;
  const wg = c.createGain(); wg.gain.value = 0.16;
  white.connect(hp).connect(lp).connect(wg).connect(out);
  const rumble = loopSource(c, "brown");
  const rl = c.createBiquadFilter(); rl.type = "lowpass"; rl.frequency.value = 280;
  const rg = c.createGain(); rg.gain.value = 0.3;
  rumble.connect(rl).connect(rg).connect(out);
  const drops = noiseBuffer(c, "white", 1);
  const timer = setInterval(() => {
    const s = c.createBufferSource(); s.buffer = drops;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2200 + Math.random() * 3200; bp.Q.value = 6;
    const g = c.createGain(); const t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.05, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(bp).connect(g).connect(out); s.start(t, Math.random() * 0.8, 0.08);
  }, 110);
  return { stop: () => { clearInterval(timer); try { white.stop(); rumble.stop(); } catch { /* */ } wg.disconnect(); rg.disconnect(); } };
}

const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]; // C mayor pentatonik (C4..E5)

function genPiano(c: AudioContext, out: AudioNode): Gen {
  const delay = c.createDelay(1.5); delay.delayTime.value = 0.43;
  const fb = c.createGain(); fb.gain.value = 0.36;
  const wet = c.createGain(); wet.gain.value = 0.45;
  const damp = c.createBiquadFilter(); damp.type = "lowpass"; damp.frequency.value = 1600;
  delay.connect(damp).connect(fb).connect(delay);
  damp.connect(wet).connect(out);
  let timer: ReturnType<typeof setTimeout>;
  let alive = true;
  const note = (freq: number, vel: number) => {
    const t = c.currentTime;
    const o1 = c.createOscillator(); o1.type = "triangle"; o1.frequency.value = freq;
    const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2;
    const g2 = c.createGain(); g2.gain.value = 0.22;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = state.energized ? 3200 : 2000;
    o1.connect(g); o2.connect(g2).connect(g);
    g.connect(lp); lp.connect(out); lp.connect(delay);
    o1.start(t); o2.start(t); o1.stop(t + 3); o2.stop(t + 3);
  };
  const tick = () => {
    if (!alive) return;
    const e = state.energized;
    const idx = Math.floor(Math.random() * (e ? SCALE.length : SCALE.length - 2));
    const f = SCALE[idx] * (e && Math.random() < 0.35 ? 2 : 1);
    note(f, 0.16 + Math.random() * 0.08);
    if (Math.random() < 0.28) note(SCALE[(idx + 2) % SCALE.length] / 2, 0.1); // sesekali dua nada
    timer = setTimeout(tick, ((1300 + Math.random() * 1900) / (e ? 1.7 : 1)));
  };
  tick();
  return { stop: () => { alive = false; clearTimeout(timer); delay.disconnect(); fb.disconnect(); } };
}

function launch(track: TrackId) {
  const c = ensureCtx();
  if (!c || !master) return;
  active?.stop();
  const make = { "soft-piano": genPiano, "gentle-rain": genRain, "brown-noise": genBrown, "ocean-waves": genOcean }[track];
  active = make(c, master);
}

export async function startMusic(track?: TrackId): Promise<boolean> {
  const c = ensureCtx();
  if (!c) return false;
  try { if (c.state === "suspended") await c.resume(); } catch { return false; }
  if (c.state !== "running") return false;
  if (track) state.track = track;
  state.playing = true;
  launch(state.track);
  applyGain(0.4);
  savePrefs();
  emit();
  return true;
}

export function stopMusic() {
  if (!state.playing) return;
  state.playing = false;
  state.energized = false;
  applyGain(0.25);
  const a = active;
  active = null;
  setTimeout(() => a?.stop(), 900); // setelah fade-out
  emit();
}

export async function toggleMusic() { if (state.playing) stopMusic(); else await startMusic(); }

export function setTrack(track: TrackId) {
  state.track = track;
  savePrefs();
  if (state.playing) launch(track);
  emit();
}

export function setVolume(v: number) {
  state.volume = Math.min(Math.max(v, 0), 1);
  savePrefs();
  applyGain();
  emit();
}

export function setEnergized(on: boolean) {
  if (state.energized === on) return;
  state.energized = on;
  applyGain(0.8);
  emit();
}

/** Turunkan volume sebentar saat alert berbunyi agar bunyi alert terdengar jelas. */
export function duckMusic(ms = 3500) {
  duckFactor = 0.25;
  applyGain(0.05);
  if (duckTimer) clearTimeout(duckTimer);
  duckTimer = setTimeout(() => { duckFactor = 1; applyGain(0.6); }, ms);
}

/** Tinggi batang visual 0..1 untuk `n` batang (dari analyser). */
export function getBars(n: number): number[] {
  if (!analyser || !state.playing) return Array(n).fill(0);
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const out: number[] = [];
  const usable = Math.floor(data.length * 0.7);
  for (let i = 0; i < n; i++) {
    const from = Math.floor((i / n) * usable), to = Math.max(from + 1, Math.floor(((i + 1) / n) * usable));
    let sum = 0;
    for (let j = from; j < to; j++) sum += data[j];
    out.push(Math.min(sum / (to - from) / 200, 1));
  }
  return out;
}
