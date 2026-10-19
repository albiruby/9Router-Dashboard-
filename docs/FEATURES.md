# Fitur & Pembeda

9Router Pulse adalah **lapisan observability read-only** untuk instance 9Router — berjalan sebagai aplikasi terpisah, menempel pada API 9Router yang sudah ada, dan tidak pernah mengubah konfigurasinya.

## Fitur lengkap

### Ringkasan `/`
- **Peta aliran live**: node provider mengorbit router pusat; garis menyala mengikuti request yang sedang berjalan.
- **Strip Denyut**: 10 menit terakhir sebagai bar per menit + metrik mini + chip provider error; bar berdenyut saat trafik padat.
- **Shockwave**: cincin gelombang di peta ketika sebuah provider error.
- **Stat strip**: request, token masuk, token cached, token keluar, estimasi biaya — dengan animasi count-up.
- **Feed request** terbaru + pencarian model/provider + filter periode (hari ini → semua).
- **Grid kesehatan provider** + drawer detail + pemeriksaan kuota per koneksi (on-demand).

### Analitik `/analytics`
- **Tren** token/biaya/request per periode dengan pengalih metrik.
- **Komposisi provider** (porsi request/token/biaya).
- **Liga model** — peringkat model berdasarkan pemakaian.
- **Panel akun** dan **panel endpoint**.
- **Ketersediaan model** — status cooldown/unavailable beserta error terakhir.

### Request `/requests`
- Penjelajah observability: filter rentang waktu, provider, model, dan status; paginasi 25/50/100 baris.
- Kolom TTFT, durasi total, token masuk → keluar + persentase cached, status, akun, endpoint.
- **Drawer detail** per request: metrik lengkap, metadata, dan payload mentah (diredaksi oleh 9Router).
- **Ekspor CSV/JSON** mengikuti filter yang aktif.

### Lintas halaman
- Sesi 24 jam (cookie `httpOnly`); seluruh trafik lewat proxy server-side.
- Navigasi bersama, waktu relatif, dan tema gelap dengan token desain sendiri.
- Responsif untuk ponsel.
- Jeda siaran live tanpa memutus koneksi.
- Notifikasi desktop opsional saat provider error.
- **Mode demo** penuh tanpa instance 9Router.

## Pembeda dari dashboard 9Router original

Dashboard original fokus pada **manajemen** 9Router (di dalam aplikasinya). Pulse fokus pada **pengamatan** — berikut bedanya:

| Aspek | Dashboard original | 9Router Pulse |
|---|---|---|
| Posisi | Bagian dari aplikasi 9Router | Aplikasi terpisah, memantau dari luar |
| Pembaruan | Polling per halaman | SSE live + animasi (garis, Denyut, count-up, shockwave) |
| Topologi | Tidak ada | Peta aliran live |
| Analitik | Chart sederhana di halaman usage | Halaman analitik lengkap (tren, komposisi, liga model, akun, endpoint, cooldown) |
| Detail request | Tabel + modal | Tabel kaya (TTFT/total per baris, cached %) + ekspor CSV/JSON + filter rentang |
| Notifikasi | Toast di layar | Notifikasi desktop saat provider error |
| Aksi tulis | CRUD penuh (provider, combo, dsb.) | Read-only by design |
| Demo tanpa 9Router | Tidak bisa | Mode demo bawaan |
| Bahasa | Inggris | Indonesia (istilah teknis dibiarkan apa adanya) |

### Yang ada di original, sengaja tidak ada di Pulse

Manajemen provider, combos, token-saver, translator, skills, MITM, proxy pools, endpoint, CLI tools, media providers, dan chat playground. Pulse bukan pengganti dashboard itu — ia **pendamping** untuk melihat apa yang sedang terjadi.

## Roadmap

- **v3-A**: Time Machine (replay 30–60 menit terakhir), feed insiden + deteksi anomali otomatis, scorecard provider & ekonomi model, uptime bar 24 jam/7 hari, delta vs periode sebelumnya.
- **v3-B**: webhook alerting (Discord/Telegram/Slack) + tombol tes, proyeksi biaya & anggaran, digest harian.
- **v3-C**: share read-only/status page, badge embed untuk README/Slack, fleet multi-instance, PWA + push notification.
- **Fase 4**: halaman `/models` (katalog + rantai combo), command palette `Ctrl+K`, `/wall` kiosk mode.

Ide fitur baru dipersilakan lewat Issue — lihat [CONTRIBUTING.md](../CONTRIBUTING.md).
