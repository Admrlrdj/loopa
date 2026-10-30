// Logika pelabelan alat kumpul data webcam laptop (/collect).
//
// Ide: protokol rekam TERPANDU menentukan kebenaran sebagian label (mis. "tutup mata" -> eye_closed), sedangkan kotak
// (kepala, mata, mulut) diambil dari model yang sudah ada. Kelas yang tidak ditentukan protokol hanya dipakai bila model
// cukup yakin; selain itu frame dibuang (label sebagian akan mengajari model bahwa objek itu "tidak ada").
// Hasil tetap perlu diperiksa pengguna lewat pratinjau kotak sebelum dipakai untuk training.

export const CLASSES = ["eye_closed", "eye_open", "head_dropped", "head_straight", "no_yawn", "yawn"] as const;
export type ClassName = (typeof CLASSES)[number]; // urutan = data.yaml kantukv2 (indeks kelas YOLO)

export type Group = "eye" | "mouth" | "head";
const GROUPS: Record<Group, ClassName[]> = {
  eye: ["eye_open", "eye_closed"],
  mouth: ["no_yawn", "yawn"],
  head: ["head_straight", "head_dropped"],
};

export interface Det { label: string; confidence: number; bbox?: number[] | null } // bbox xyxy ternormalisasi
export type Override = Partial<Record<Group, ClassName>>;

export interface Step { id: string; title: string; hint: string; seconds: number; override: Override }

export const STEPS: Step[] = [
  { id: "neutral", title: "Look at the screen", hint: "Eyes open, mouth closed, head straight. Read or browse like normal.", seconds: 8,
    override: { eye: "eye_open", mouth: "no_yawn", head: "head_straight" } },
  { id: "eyes-closed", title: "Close your eyes", hint: "Keep your eyes gently closed, head straight, mouth closed.", seconds: 7,
    override: { eye: "eye_closed", mouth: "no_yawn", head: "head_straight" } },
  { id: "yawn", title: "Hold a wide yawn", hint: "Open your mouth wide like a yawn and hold it. Rest a second, repeat. Keep your head straight.", seconds: 9,
    override: { mouth: "yawn", head: "head_straight" } },
  { id: "talk", title: "Talk or smile", hint: "Say something out loud or smile with your mouth open. This is NOT a yawn.", seconds: 8,
    override: { eye: "eye_open", mouth: "no_yawn", head: "head_straight" } },
  { id: "head-down", title: "Let your head drop", hint: "Tilt your head down as if dozing off. Keep your face visible to the camera.", seconds: 7,
    override: { head: "head_dropped", mouth: "no_yawn" } },
];

export interface Labeled { lines: string[]; boxes: { cls: ClassName; box: number[]; group: Group }[] }

/** Pilih satu kotak terbaik per kelompok dan bentuk baris label YOLO. Mengembalikan null bila frame tidak layak. */
export function buildLabels(dets: Det[], override: Override, minConf = 0.3, minUnsureConf = 0.5): Labeled | null {
  const boxes: Labeled["boxes"] = [];
  for (const group of Object.keys(GROUPS) as Group[]) {
    let best: Det | null = null;
    for (const d of dets) {
      if (!d.bbox || d.bbox.length !== 4 || !(GROUPS[group] as string[]).includes(d.label)) continue;
      if (d.confidence >= minConf && (!best || d.confidence > best.confidence)) best = d;
    }
    if (!best?.bbox) return null; // kotak tidak ditemukan
    const forced = override[group];
    if (!forced && best.confidence < minUnsureConf) return null; // kelas tidak ditentukan protokol dan model ragu
    const cls = (forced ?? best.label) as ClassName;
    const [x1, y1, x2, y2] = best.bbox.map((v) => Math.min(Math.max(v, 0), 1));
    if (x2 - x1 < 0.01 || y2 - y1 < 0.01) return null;
    boxes.push({ cls, box: [x1, y1, x2, y2], group });
  }
  const lines = boxes.map(({ cls, box: [x1, y1, x2, y2] }) =>
    `${CLASSES.indexOf(cls)} ${((x1 + x2) / 2).toFixed(6)} ${((y1 + y2) / 2).toFixed(6)} ${(x2 - x1).toFixed(6)} ${(y2 - y1).toFixed(6)}`);
  return { lines, boxes };
}

export const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "take";
