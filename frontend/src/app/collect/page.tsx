"use client";
import { IconCamera, IconFolderOpen, IconPlayerPlayFilled, IconPlayerStopFilled } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWebcam } from "@/hooks/useWebcam";
import { api } from "@/lib/api";
import { buildLabels, CLASSES, slug, STEPS, type Labeled } from "@/lib/collect";

// File System Access API (Chrome/Edge). Tipe minimal agar tidak butuh paket tipe tambahan.
type FsDir = { name: string; getDirectoryHandle(n: string, o?: { create?: boolean }): Promise<FsDir>;
  getFileHandle(n: string, o?: { create?: boolean }): Promise<{ createWritable(): Promise<{ write(d: Blob | string): Promise<void>; close(): Promise<void> }> }> };

const FRAME_MS = 350;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function writeFile(root: FsDir, path: string[], data: Blob | string) {
  let dir = root;
  for (const p of path.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create: true });
  const w = await (await dir.getFileHandle(path[path.length - 1], { create: true })).createWritable();
  await w.write(data);
  await w.close();
}

export default function CollectPage() {
  const cam = useWebcam();
  const [dir, setDir] = useState<FsDir | null>(null);
  const [take, setTake] = useState("lamp-day1");
  const [split, setSplit] = useState<"train" | "valid" | "test">("train");
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [count, setCount] = useState(3);
  const [saved, setSaved] = useState<Record<string, number>>({});
  const [classes, setClasses] = useState<Record<string, number>>({});
  const [skipped, setSkipped] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const cancel = useRef(false);
  const preview = useRef<HTMLCanvasElement>(null);

  useEffect(() => { void cam.start(); return () => cam.stop(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function pickDir() {
    const w = window as unknown as { showDirectoryPicker?: (o?: object) => Promise<FsDir> };
    if (!w.showDirectoryPicker) { setMsg("Your browser can't save to a folder. Use Chrome or Edge on desktop."); return; }
    try { setDir(await w.showDirectoryPicker({ mode: "readwrite" })); setMsg(null); } catch { /* dibatalkan */ }
  }

  const drawPreview = useCallback(async (blob: Blob, lab: Labeled | null) => {
    const c = preview.current; if (!c) return;
    const bmp = await createImageBitmap(blob);
    c.width = 480; c.height = Math.round((bmp.height / bmp.width) * 480);
    const g = c.getContext("2d"); if (!g) return;
    g.drawImage(bmp, 0, 0, c.width, c.height);
    for (const b of lab?.boxes ?? []) {
      const [x1, y1, x2, y2] = b.box;
      g.strokeStyle = "#22c55e"; g.lineWidth = 2; g.strokeRect(x1 * c.width, y1 * c.height, (x2 - x1) * c.width, (y2 - y1) * c.height);
      g.fillStyle = "#22c55e"; g.font = "12px sans-serif"; g.fillText(b.cls, x1 * c.width + 3, Math.max(12, y1 * c.height - 4));
    }
  }, []);

  async function runTake() {
    if (!dir || !cam.videoRef.current) return;
    const name = slug(take);
    cancel.current = false; setRunning(true); setSaved({}); setClasses({}); setSkipped(0); setMsg(null);
    const savedLocal: Record<string, number> = {}, classLocal: Record<string, number> = {};
    let skippedLocal = 0;
    const canvas = document.createElement("canvas");
    try {
      for (let si = 0; si < STEPS.length && !cancel.current; si++) {
        const step = STEPS[si];
        setStepIdx(si);
        for (let c = 3; c > 0 && !cancel.current; c--) { setCount(c); await sleep(1000); }
        setCount(0);
        const t0 = performance.now();
        let n = 0;
        while (performance.now() - t0 < step.seconds * 1000 && !cancel.current) {
          const tick = performance.now();
          const v = cam.videoRef.current;
          if (v && v.videoWidth) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight;
            canvas.getContext("2d")?.drawImage(v, 0, 0);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
            const blob = await (await fetch(dataUrl)).blob();
            const res = await api.detect(dataUrl.split(",")[1]);
            const lab = buildLabels(res.detections, step.override);
            void drawPreview(blob, lab);
            if (lab) {
              const id = `${name}_${step.id}_${String(n++).padStart(3, "0")}`;
              await writeFile(dir, [split, "images", `${id}.jpg`], blob);
              await writeFile(dir, [split, "labels", `${id}.txt`], lab.lines.join("\n") + "\n");
              savedLocal[step.id] = (savedLocal[step.id] ?? 0) + 1;
              for (const b of lab.boxes) classLocal[b.cls] = (classLocal[b.cls] ?? 0) + 1;
              setSaved({ ...savedLocal }); setClasses({ ...classLocal });
            } else { skippedLocal++; setSkipped(skippedLocal); }
          }
          await sleep(Math.max(0, FRAME_MS - (performance.now() - tick)));
        }
      }
      await writeFile(dir, ["meta", `${name}.json`], JSON.stringify({
        take: name, split, date: new Date().toISOString(), saved: savedLocal, classes: classLocal, skipped: skippedLocal,
        steps: STEPS.map((s) => ({ id: s.id, override: s.override })), userAgent: navigator.userAgent,
      }, null, 2));
      setMsg(cancel.current ? "Stopped. Frames saved so far are kept." : "Take finished. Review the boxes in the preview, then record more takes in different conditions.");
    } catch (e) {
      setMsg(`Stopped: ${(e as Error).message}. Is the backend running with ENABLE_DETECT=true?`);
    } finally { setRunning(false); setStepIdx(-1); }
  }

  const total = Object.values(saved).reduce((a, b) => a + b, 0);
  const step = stepIdx >= 0 ? STEPS[stepIdx] : null;

  return (
    <div className="page-wrap px-4 pb-14 pt-5 md:px-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-3xl font-extrabold" style={{ color: "var(--brand)" }}>Loopa</Link>
        <span className="eyebrow">Developer tool</span>
      </header>
      <main className="mx-auto mt-4 max-w-5xl space-y-5">
        <div>
          <h1 className="text-3xl font-bold">Collect laptop-camera data</h1>
          <p className="mt-1 text-sm muted">
            Record guided takes with your own webcam to adapt the model to laptop/PC cameras. Frames and labels are saved only to a folder you choose on this
            computer; nothing is uploaded. Record yourself, or people who agreed. Needs the local backend started with <code>ENABLE_DETECT=true</code>.
          </p>
        </div>

        <section className="card grid gap-4 !rounded-2xl md:grid-cols-4">
          <label className="text-xs font-bold md:col-span-2">Take name (lighting, day, glasses…)
            <input className="field mt-1" value={take} onChange={(e) => setTake(e.target.value)} disabled={running} />
          </label>
          <label className="text-xs font-bold">Split
            <select className="field mt-1" value={split} onChange={(e) => setSplit(e.target.value as "train" | "valid" | "test")} disabled={running}>
              <option value="train">train</option><option value="valid">valid</option><option value="test">test</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className="btn w-full" onClick={pickDir} disabled={running}><IconFolderOpen size={18} aria-hidden />{dir ? dir.name : "Choose output folder"}</button>
          </div>
          <p className="text-xs muted md:col-span-4">
            Choose <code>datasets/laptopcam</code>. Use <b>different takes</b> for train, valid and test (different lighting or day), never the same take in two splits.
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="card space-y-3 !rounded-2xl">
            <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "4/3" }}>
              <video ref={cam.videoRef} autoPlay muted playsInline className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
              {step && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-3 text-white">
                  <p className="text-sm font-bold">{count > 0 ? `Get ready… ${count}` : step.title}</p>
                  <p className="text-xs opacity-90">{step.hint}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!running ? (
                <button className="btn btn-primary flex-1" disabled={!dir || cam.state !== "ready" || !take.trim()} onClick={runTake}><IconPlayerPlayFilled size={16} aria-hidden />Start guided take</button>
              ) : (
                <button className="btn btn-danger flex-1" onClick={() => { cancel.current = true; }}><IconPlayerStopFilled size={16} aria-hidden />Stop</button>
              )}
            </div>
            {cam.state !== "ready" && <p className="text-xs muted"><IconCamera size={14} className="inline" aria-hidden /> Camera: {cam.state}</p>}
            {msg && <p role="status" className="text-sm">{msg}</p>}
            <ol className="space-y-1 text-xs muted">
              {STEPS.map((s, i) => <li key={s.id} style={{ fontWeight: i === stepIdx ? 700 : 400, color: i === stepIdx ? "var(--brand)" : undefined }}>{i + 1}. {s.title} ({s.seconds}s) — {saved[s.id] ?? 0} saved</li>)}
            </ol>
          </section>

          <section className="card space-y-3 !rounded-2xl">
            <h2 className="font-bold">Preview of the last frame (check the boxes)</h2>
            <canvas ref={preview} className="w-full rounded-xl bg-[#f3ecff]" width={480} height={360} />
            <p className="text-sm"><b>{total}</b> frames saved · {skipped} skipped (a box was missing or the model was unsure)</p>
            <p className="text-xs muted">{CLASSES.map((c) => `${c} ${classes[c] ?? 0}`).join(" · ")}</p>
            <p className="text-xs muted">If boxes look wrong (not on the eyes, mouth or head), don&apos;t train on this take: move closer, add light, or tell the team.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
