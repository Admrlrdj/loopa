# Smart Study Assistant (Loopa)

Pomodoro kustom + deteksi indikasi kantuk via webcam (YOLO fine-tuned pada kantukv2) + rekomendasi AI.
Spesifikasi: `docs/SMART_STUDY_ASSISTANT_PRD_v1.md` dan `docs/SMART_STUDY_ASSISTANT_Project_Brief_v2.md`.
Hasil deteksi hanyalah indikasi visual, bukan diagnosis; Loopa tidak mengukur fokus/konsentrasi (di luar PRD).

Daftar tugas (sudah/belum) dan panduan kalibrasi, NO_FACE, suara, break, serta UAT/demo: [`docs/TASKLIST.md`](docs/TASKLIST.md).

## Alamat produksi

| Bagian | Platform | URL |
|---|---|---|
| Web (Next.js) | Vercel, team `admieral`, proyek `loopa-smart-study` | https://loopa-smart-study.vercel.app |
| Backend (FastAPI + YOLO) | Railway, proyek `lucid-intuition`, service `loopa-backend` | https://loopa-backend-production-44f3.up.railway.app |

Web membaca URL backend dari `NEXT_PUBLIC_API_URL` (diset di Vercel, environment Production). Backend mengizinkan origin web lewat `CORS_ORIGINS`.
Kamera hanya jalan di HTTPS atau `localhost`.

## Struktur

Semua path di dokumen ini relatif terhadap folder `loopa/` (folder induk `Project Viskom & Citra` hanya berisi `loopa/`).

```
backend/        FastAPI: app/{api,services,schemas,db,core}, tests/, scripts/, Dockerfile (Railway)
frontend/       Next.js 15 (App Router): home, setup, session, break, summary, history, statistics
models/         best.pt (YOLO11n hasil training CPU), runs/, eval_runs/, pretrained/yolo11n.pt
notebooks/      kantukv2_audit_train_eval.ipynb (Colab GPU)
datasets/       kantukv2 (v2) + kantukv2_split (split ulang berbasis kelompok), tidak di-commit
scripts/        audit_dataset, resplit_dataset, download_dataset, train_yolo, evaluate_yolo
metadata/       dataset_manifest.json, resplit.json, eval_report.json, training_run.json
logs/           log training
docs/           PRD, Project Brief v2, references/ (jurnal), archive/ (dokumen lama)
_legacy/        pendekatan lama (MediaPipe, Random Forest), tidak dipakai MVP
```

Pemetaan ke Brief §17: inferensi, analisis temporal, dan decision engine ada di `backend/app/services/` (`inference.py`, `temporal.py`, `decision_engine.py`); `backend/routes` = `backend/app/api`.

## Menjalankan lokal

```powershell
powershell -ExecutionPolicy Bypass -File start.ps1                    # memakai backend/.env
powershell -ExecutionPolicy Bypass -File start.ps1 -Scenario drowsy   # hanya berlaku untuk INFERENCE_BACKEND=mock
```

Web: http://localhost:3000 · API/docs: http://localhost:8000/docs

> Nama folder berisi `&`, jadi skrip npm memanggil `node node_modules/next/...` langsung (shim `.bin` Windows rusak karena karakter itu).

Konfigurasi backend ada di `backend/.env` (salin dari `backend/.env.example`, jangan di-commit). Mode inferensi: `INFERENCE_BACKEND=yolo` (memakai `models/best.pt`, `YOLO_IMGSZ=320`) atau `mock`.

## Dataset dan model

- **Dataset:** Roboflow kantukv2 **v2** (3.841 gambar, 6 kelas, CC BY 4.0). Satu-satunya dataset yang dipakai.
- **Masalah split bawaan:** v2 tidak punya validation set dan 109 dari 192 gambar test punya varian augmentasi dari gambar sumber yang sama di train (kebocoran). `scripts/resplit_dataset.py` membagi ulang per kelompok sumber: train 3.069, valid 577, test 195. Kunci kelompok berbasis nama file, jadi hanya perkiraan.
- **Model:** YOLO11n pretrained, fine-tuning di CPU: 12 epoch, `imgsz` 320, 35% data train (`--fraction 0.35`).
- **Hasil test set** (195 gambar): precision 0,885 · recall 0,920 · **mAP50 0,959** · mAP50-95 0,622. Terlemah: `eye_closed` (mAP50 0,923) dan `head_dropped` (recall 0,80). Latensi ±52 ms/frame di CPU laptop. Rincian: `metadata/eval_report.json`.
- **Batasan:** gambar statis dari kamera mobil, belum diuji di webcam laptop; kualitas hitungan blink/yawn perlu uji video terpisah. Threshold alert masih sementara.

Mengulang training (Colab GPU lebih disarankan untuk model penuh):

```bash
python scripts/download_dataset.py --version 2            # butuh ROBOFLOW_API_KEY di environment
python scripts/audit_dataset.py datasets/kantukv2 --version 2 --license "CC BY 4.0"
python scripts/resplit_dataset.py datasets/kantukv2 datasets/kantukv2_split
python scripts/train_yolo.py datasets/kantukv2_split/data.yaml --model yolo11n.pt --epochs 50 --device 0   # -> models/best.pt
python scripts/evaluate_yolo.py datasets/kantukv2_split/data.yaml --weights models/best.pt                  # -> metadata/eval_report.json
```

## AI rekomendasi (LLM)

- Dipakai di **Summary** (rekomendasi sesi) dan **halaman Break** (tip singkat dari blok yang baru selesai, endpoint `POST /sessions/{id}/break-tip`).
- LLM **tidak dilatih ulang**: ia diberi konteks cara kerja Loopa lewat prompt (`backend/app/services/insights.py`) ditambah metrik terstruktur dari kamera (blink, yawn, eye closure, alert, estimasi waktu mengantuk). Tidak ada frame/video yang dikirim; aturan prompt melarang diagnosis dan klaim fokus.
- Lewat OpenRouter (API gaya OpenAI). Variabel: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_FALLBACK_MODELS`, `LLM_TIMEOUT_SECONDS`.
- Model utama saat ini: `nvidia/nemotron-3-ultra-550b-a55b:free` (model reasoning; klien mengirim `reasoning: {effort: low, exclude: true}` dan membuang teks yang tampak seperti proses berpikir). Cadangan: `google/gemma-4-26b-a4b-it:free`. Model gratis sering kena 429/504, jadi sebagian permintaan jatuh ke teks fallback. Label sementara `[temp] AI model: ...` di web menampilkan model yang menjawab (`frontend/src/components/ui/AiModelNote.tsx`, hapus sebelum final).
- Bila key kosong atau LLM gagal, aplikasi memakai teks fallback aturan sehingga sesi tetap selesai. **`LLM_API_KEY` di Railway diisi manual lewat dashboard** (tidak lewat CLI).

## Deploy

**Web (Vercel):** dari folder `frontend/`:

```bash
vercel deploy --prod --yes
```

Font Inter dibundel lewat `@fontsource-variable/inter` karena `next/font/google` gagal mengunduh font saat build di Vercel. Mengubah `NEXT_PUBLIC_API_URL` butuh redeploy (nilai tertanam saat build).

**Backend (Railway):** dari folder `backend/` (butuh `backend/models/best.pt`; `.railwayignore` mencegah `.env` dan `.venv` ikut terunggah):

```bash
railway up --service loopa-backend --detach
```

Image memakai torch CPU, 1 worker uvicorn (state sesi ada di memori). Variabel non-rahasia diset lewat CLI; `LLM_API_KEY` lewat dashboard.

## Status

- Backend: semua endpoint PRD + `break-tip`, state machine alert 2 tahap, **33 tes lulus**.
- Web: setup → sesi (webcam, timer, Alert 1/2, saran) → break (tip AI) → summary (rekomendasi AI) → riwayat → statistik; desain mengikuti Figma "loopa" (Inter, Tabler Icons, aset SVG resmi).
- Produksi: web + backend YOLO live dan terhubung.
- **Belum / perlu diperhatikan:**
  - `LLM_API_KEY` di Railway belum diisi, jadi di produksi AI masih memakai teks fallback.
  - Uji webcam asli di URL produksi dan kalibrasi threshold alert (PRD §17).
  - Data sesi di Railway di memori dan hilang saat restart; Supabase belum aktif.
  - Belum ada login/username/avatar dan riwayat per pengguna (bagian PM). Riwayat masih global.
  - Model hasil training CPU subset; untuk laporan akhir sebaiknya latih penuh di GPU (atau pakai model dari PM).
  - Halaman Break, History, Statistics, dan Summary belum diperiksa visual penuh setelah restyle.
