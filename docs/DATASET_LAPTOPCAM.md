# Dataset webcam laptop/PC

## Masalahnya
kantukv2 berisi frame **kamera di dalam mobil** (pengemudi, latar kabin). Webcam laptop/PC berbeda: latar, pencahayaan, jarak, sudut, dan kualitas sensor. Model hasil kantukv2 saja akan lebih lemah di webcam (metrik 0,959 mAP50 hanyalah untuk domain mobil). Cara memperbaikinya yang jujur: **data dari webcam laptop**, bukan hanya augmentasi.

> Catatan terhadap PRD: PRD §3.1 menetapkan kantukv2 sebagai satu-satunya dataset. Menambah data webcam sendiri adalah keputusan tim di luar PRD dan harus dicatat di laporan (sumber, jumlah orang, persetujuan).

## Alur

1. **Jalankan backend lokal dengan `/detect` aktif** (alat ini hanya untuk lokal): di `backend/.env` set `ENABLE_DETECT=true`, lalu `powershell -ExecutionPolicy Bypass -File start.ps1`.
2. Buka **http://localhost:3000/collect** di Chrome/Edge, izinkan kamera, dan klik *Choose output folder* → pilih `datasets/laptopcam`.
3. **Rekam take terpandu.** Satu take = 5 langkah (±40 detik): menatap layar, menutup mata, menahan menguap lebar, bicara/senyum dengan mulut terbuka (bukan menguap), dan kepala menunduk. Aplikasi menghitung mundur 3 detik di setiap langkah.
   - Kebenaran kelas ditentukan protokol (mis. langkah "tutup mata" = `eye_closed`). Kotak kepala/mata/mulut diambil dari model; frame dibuang bila kotak tidak ditemukan atau model ragu untuk kelas yang tidak ditentukan protokol.
   - **Periksa pratinjau kotak.** Bila kotak tidak berada di mata/mulut/kepala, jangan pakai take itu.
4. **Variasikan kondisi** (satu *take name* per kondisi): lampu menyala/redup/backlight, kacamata, jarak dekat/jauh, ruangan berbeda, orang berbeda (dengan persetujuan), hari berbeda.
5. **Bagi per take, bukan per frame:** pilih `train` untuk sebagian besar take, `valid` untuk 1–2 take, `test` untuk 1–2 take lain. Satu take hanya boleh ada di satu split (frame berurutan sangat mirip, kebocoran akan membuat metrik palsu).
6. **Target minimum yang disarankan:** ≥ 300 frame train, ≥ 3 kondisi berbeda, ≥ 2 orang bila memungkinkan, dan setiap kelas muncul di setiap split.

## Validasi dan gabung

```bash
backend\.venv\Scripts\python.exe -I scripts/prepare_laptopcam.py
```
Melaporkan jumlah gambar/kelas per split, mendeteksi **kebocoran take antar split**, label rusak, kelas yang hilang, lalu menulis `datasets/laptopcam/data.yaml` (hanya domain laptop) dan `datasets/combined_data.yaml` (kantukv2_split + laptopcam; `test` = laptopcam).

## Fine-tuning dari model yang ada

```bash
backend\.venv\Scripts\python.exe -I scripts/train_yolo.py datasets/combined_data.yaml --model models/best.pt --epochs 30 --imgsz 416 --batch 16 --device cpu --strong-aug --lr0 0.002 --name laptopcam_ft
```
- `--model models/best.pt` melanjutkan dari bobot yang sudah ada (bukan dari nol), `--lr0` kecil menjaga pengetahuan lama, `--strong-aug` memperkuat augmentasi cahaya/skala/posisi.
- Untuk hasil terbaik latih di GPU (Colab). Opsi `--freeze 10` membekukan backbone bila data laptop sedikit.

## Evaluasi yang jujur

```bash
backend\.venv\Scripts\python.exe -I scripts/evaluate_yolo.py datasets/laptopcam/data.yaml --weights models/best.pt   # SEBELUM fine-tune: kondisi nyata
backend\.venv\Scripts\python.exe -I scripts/evaluate_yolo.py datasets/laptopcam/data.yaml --weights models/runs/laptopcam_ft/weights/best.pt
```
Bandingkan keduanya pada **test laptopcam** (take yang tidak dipakai training). Laporkan juga uji video (`scripts/replay_video.py`) karena metrik deteksi tidak menilai hitungan blink/yawn. Bila lebih baik, salin ke `models/best.pt` dan `backend/models/best.pt`, lalu `git push` (Railway membangun ulang dari GitHub).

## Privasi
Frame disimpan hanya di folder yang Anda pilih; tidak ada yang diunggah. Jangan commit `datasets/` ke GitHub (sudah diabaikan oleh `.gitignore`). Rekam diri sendiri atau orang yang menyetujui, dan hapus data atas permintaan.
