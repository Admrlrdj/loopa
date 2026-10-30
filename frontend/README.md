# Frontend — Smart Study Assistant (Next.js 15 + Tailwind 4 + Recharts)

```powershell
cd frontend
npm install
copy .env.local.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                            # http://localhost:3000
npm run lint                           # typecheck
```

Halaman: `/` Home · `/setup` · `/session` · `/break` · `/summary?id=` · `/history`.

- `src/lib/api.ts` klien API (tipe di `src/types/api.ts`, cermin `backend/app/schemas/models.py`).
- `src/hooks/useCountdown.ts` timer berbasis timestamp (aman saat tab di background) dengan akuntansi jeda.
- `src/hooks/useWebcam.ts` kamera + ambil frame JPEG (480px); frame berikutnya menunggu respons sebelumnya.
- `src/lib/audio.ts` bunyi alert via WebAudio; bila diblokir browser, modal menampilkan "Suara tidak tersedia".
- `src/components/alerts/AlertModals.tsx` Alert 1, Alert 2, Advice, Confirm.
- Status rangkaian disimpan di `sessionStorage` (`src/lib/run.ts`) agar refresh tidak menghilangkan sesi.

Kamera butuh `localhost` atau HTTPS. Untuk akses publik, deploy web (mis. Vercel) dan backend (host dengan 1 worker uvicorn) lalu isi `NEXT_PUBLIC_API_URL` dan `CORS_ORIGINS`.

## Desain (Figma "loopa")
- Font: **Inter** (`next/font/google`), judul Bold. Warna: `#351080`, `#30205F`, `#D4C4FF`, `#F0E8FF`, `#FFF34A` (lihat `globals.css`).
- Ikon: **Tabler Icons** (`@tabler/icons-react`), sama dengan layer `tabler-icon-*` di Figma.
- `public/assets/`: `mascot.svg`, `loopa-mark.svg` (logo monitor), `plant.svg` — semuanya ekspor SVG resmi dari Figma (layer `tabler-icon-device-desktop-filled`, grup `Komputer kartun — mata lonjong`, `tabler-icon-seedling-filled`). Wordmark "Loopa" dan tagline dibangun dari teks Inter.
