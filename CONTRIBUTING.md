# Kontribusi

Terima kasih ingin ikut mengembangkan 9Router Pulse! Panduan singkat:

## Menyiapkan lingkungan

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
# set NINE_ROUTER_MOCK=1 untuk data demo — semua pekerjaan UI bisa dilakukan tanpa 9Router
npm run dev
```

## Sebelum mengirim PR

Jalankan ketiganya sampai bersih:

```bash
npm run lint
npm run typecheck
npm run build
```

Persyaratan Node.js: **20.9+**.

## Konvensi

- **Bahasa UI: Indonesia.** Pesan error ramah pengguna, istilah teknis (model/provider/endpoint) dibiarkan apa adanya.
- **TypeScript ketat.** Hindari `any`; tipe respons upstream di `src/lib/types.ts`.
- **Tanpa dependensi baru** kecuali benar-benar perlu — diskusikan dulu di Issue.
- **Filosofi read-only.** Pulse tidak boleh melakukan aksi tulis ke 9Router (POST/PUT/DELETE ke resource). PR yang menambah aksi tulis akan dibahas khusus dulu.
- **Pola arsitektur**: semua panggilan upstream lewat `src/lib/nine-router.ts`; route proxy di `src/app/api/live/*`; data demo wajib di `src/lib/mock.ts` supaya mode demo tetap lengkap.
- Ikuti struktur komponen yang ada (panel kecil di `src/components/<halaman>/`).

## Alur kerja

1. Fork + branch dari `main` (`feat/...`, `fix/...`).
2. Kerjakan + uji minimal dalam mode demo (`NINE_ROUTER_MOCK=1`).
3. Pastikan `lint`, `typecheck`, dan `build` hijau.
4. PR dengan deskripsi: apa yang berubah, kenapa, dan bukti tangkapan layar untuk perubahan UI.

## Melaporkan bug

Sertakan: versi 9Router, versi Node, pesan error (sensor alamat/rahasia), langkah reproduksi, dan apakah terjadi di mode demo atau mode asli.

## Ide fitur

Lihat roadmap di [docs/FEATURES.md](docs/FEATURES.md) sebelum mengusulkan — mungkin sudah direncanakan.
