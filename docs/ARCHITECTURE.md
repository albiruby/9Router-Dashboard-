# Arsitektur & Integrasi

Pulse sengaja dibuat "tipis": **tanpa SDK, tanpa dependensi ke paket 9Router**. Integrasinya memakai HTTP API internal 9Router (REST + SSE) lewat proxy server-side Next.js. Browser tidak pernah menyentuh 9Router secara langsung.

## Alur konektivitas

```
Browser (localhost:3210)
   │  cookie httpOnly: nr_session
   ▼
Next.js Pulse  ──  server-side fetch  ──►  9Router (NINE_ROUTER_URL)
   │                                        cookie: auth_token=<sesi>
   └─ /api/session + /api/live/*
```

## Autentikasi

1. Pengguna memasukkan password dashboard 9Router di form Pulse.
2. `POST /api/session` (server Pulse) memanggil `POST {NINE_ROUTER_URL}/api/auth/login`.
3. 9Router membalas `Set-Cookie: auth_token=...`; token itu disimpan sebagai cookie `httpOnly` milik Pulse (`nr_session`, 24 jam), lalu **password dibuang** (tidak ditulis ke disk, tidak dilog).
4. Semua request lanjutan dari server Pulse menyertakan header `cookie: auth_token=<token>`.

## Panggilan upstream yang dipakai

| Upstream 9Router | Proxy Pulse | Dipakai untuk |
|---|---|---|
| `POST /api/auth/login` | `POST /api/session` | Login, tukar password → token |
| `GET /api/auth/status` | `GET /api/session` | Cek sesi masih hidup |
| `GET /api/usage/stream` (SSE) | `GET /api/live/stream` | Siaran live (activeRequests, recentRequests, errorProvider, denyut) |
| `GET /api/usage/stats?period=` | `GET /api/live/stats` | Agregat periode |
| `GET /api/usage/chart?period=` | `GET /api/live/chart` | Grafik tren |
| `GET /api/usage/request-details?...` | `GET /api/live/requests` (+ `/export`) | Penjelajah request + ekspor |
| `GET /api/models/availability` | `GET /api/live/availability` | Cooldown model |
| `GET /api/providers`, `GET /api/provider-nodes` | `GET /api/live/providers` | Daftar koneksi + node |
| `GET /api/usage/[connectionId]?force=1` | `GET /api/live/quota/[id]` | Kuota per koneksi (on-demand) |

## Detail teknis

- **Transport**: `fetch` bawaan Node (undici) dari route handler. Timeout 15 detik (kuota 45 detik). `redirect: "manual"` agar halaman login 9Router terdeteksi sebagai sesi mati, bukan diikuti diam-diam.
- **SSE**: Pulse membuka stream upstream lalu meneruskannya ke browser. Sesi mati terdeteksi dari status 401/403 atau `content-type` bukan `text/event-stream`.
- **Irama data**: field live dari SSE; agregat periode disegarkan tiap 6 detik saat siaran aktif; halaman Analitik polling 20 detik; halaman Request on-demand.
- **Sesi mati**: satu respons 401 menghapus cookie dan mengarahkan klien ke `/login`.
- **Read-only**: tidak ada panggilan tulis ke 9Router. Ekspor CSV/JSON dibuat di sisi Pulse dari data yang dibaca.
- **Mode demo**: `NINE_ROUTER_MOCK=1` melewati seluruh jalur upstream — semua dijawab data contoh in-memory, nol koneksi keluar.

## Struktur kode

```text
src/
  app/
    api/session/route.ts            login, status, logout
    api/live/stream/route.ts        proxy SSE
    api/live/stats/route.ts         proxy statistik
    api/live/chart/route.ts         proxy grafik penggunaan
    api/live/availability/route.ts  proxy ketersediaan model
    api/live/requests/route.ts      proxy detail request (paginasi + filter)
    api/live/requests/export/       ekspor CSV/JSON
    api/live/providers/route.ts     proxy daftar koneksi
    api/live/quota/[id]/route.ts    proxy kuota
    login/                          halaman login
    page.tsx                        dashboard (Ringkasan)
    analytics/page.tsx              analitik penggunaan
    requests/page.tsx               penjelajah request
  components/dashboard/             topologi, statistik, feed, drawer, denyut
  components/analytics/             panel tren, provider, model, akun, endpoint
  components/requests/              tabel + drawer detail request
  hooks/                            SSE, analitik, request, sesi, provider
  lib/                              tipe, helper, mock, klien 9Router
  proxy.ts                          middleware autentikasi halaman
```

Semua penyesuaian ke API upstream terpusat di `src/lib/nine-router.ts` — route proxy dan tipe hanya bergantung ke file itu.

## Kompatibilitas

Integrasi memakai **API internal** 9Router (bukan API publik berversi). Diuji terhadap 9Router v0.5.104. Bila upstream mengubah bentuk respons, perbaikannya cukup di `src/lib/nine-router.ts` (+ tipe di `src/lib/types.ts`).

## Menambah endpoint baru

1. Tambahkan fungsi di `src/lib/nine-router.ts` (pakai `upstreamFetch` agar penanganan sesi/timeout konsisten).
2. Tambahkan tipe respons di `src/lib/types.ts`.
3. Buat route proxy di `src/app/api/live/...` yang meniru pola route lain (mock mode → data demo; sesi kosong → 401; error → `apiError`).
4. Tambahkan data demo di `src/lib/mock.ts`.
5. Buat hook + komponen dengan pola di `src/hooks/` dan `src/components/`.
