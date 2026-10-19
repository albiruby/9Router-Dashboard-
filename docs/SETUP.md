# Setup Lengkap

Panduan ini menuntun dari nol sampai 9Router Pulse berjalan — baik untuk mencoba tanpa 9Router, menyambung ke instance lokal, instance remote (Tailscale/VPS), maupun menjalankannya sebagai service atau container.

## Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| Node.js | **20.9 atau lebih baru** (kebutuhan Next.js 16). Cek dengan `node -v`. |
| Instance 9Router | Berjalan dan bisa diakses dari mesin yang menjalankan Pulse. Port bawaan 9Router: **20128**. |
| Password dashboard 9Router | Dipakai sekali saat login; tidak disimpan. |
| (Opsional) Tailscale | Jika 9Router berada di jaringan tailnet. |
| (Opsional) Docker | Jika ingin menjalankan Pulse tanpa memasang Node.js. |

Tidak ada database, tidak ada file konfigurasi wajib selain `.env.local`.

## Jalur 0 — Coba dulu tanpa 9Router (mode demo)

Cocok untuk menilai tampilan sebelum menyambungkan apa pun. Semua data dibuat lokal, **nol koneksi keluar**.

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
```

Buka `.env.local`, set:

```env
NINE_ROUTER_MOCK=1
```

Lalu:

```bash
npm run dev
```

Buka `http://localhost:3210` → klik **Masuk mode demo**. Header akan menampilkan lencana **Mode demo** selama data contoh dipakai.

## Jalur 1 — 9Router di mesin yang sama

1. Pastikan 9Router berjalan. Port bawaannya `20128` (bisa berubah sesuai konfigurasimu).
2. Isi `.env.local`:

   ```env
   NINE_ROUTER_URL=http://localhost:20128
   NINE_ROUTER_MOCK=0
   ```

3. `npm run dev` → buka `http://localhost:3210`.
4. Masuk dengan **password dashboard 9Router**. Password ditukar dengan cookie sesi di server Pulse; yang tersimpan di browser hanya cookie `httpOnly` `nr_session` (berlaku 24 jam).

## Jalur 2 — 9Router remote (Tailscale / LAN / VPS)

Isi URL sesuai cara kamu menjangkau instance, contoh:

```env
# Tailscale
NINE_ROUTER_URL=https://node-xxx.tailxxxxx.ts.net

# LAN / VPS
NINE_ROUTER_URL=http://192.168.1.10:20128
```

Catatan:

- Tanpa garis miring di akhir.
- Bila instance memakai HTTPS (Tailscale Serve, reverse proxy, dsb.) **dan** Pulse juga diakses lewat HTTPS, set `NINE_ROUTER_COOKIE_SECURE=true`.
- Uji jangkauan dulu dari terminal mesin Pulse:

  ```bash
  curl -s -o /dev/null -w "%{http_code}" http://localhost:20128/api/auth/status
  ```

  Selama URL-nya benar dan bisa dijangkau, login Pulse akan bekerja.

## Verifikasi setelah login

- **Ringkasan** — peta topologi tampil, strip Denyut bergerak, feed terisi saat ada request.
- **Analitik** — tren, komposisi provider, liga model terisi.
- **Request** — daftar detail request terisi (lihat troubleshooting bila kosong).
- Bila ada yang gagal, banner kuning muncul dengan tombol **Coba lagi**; pesan error spesifiknya ada di tabel troubleshooting di bawah.

## Produksi

```bash
npm run build
npm start        # tetap di port 3210
```

### Ubah port

Port diatur di `package.json` (`-p 3210`) pada script `dev` dan `start`. Ubah keduanya bila 3210 bentrok.

### systemd (Linux)

```ini
# /etc/systemd/system/9router-pulse.service
[Unit]
Description=9Router Pulse
After=network.target

[Service]
WorkingDirectory=/opt/9router-pulse
Environment=NINE_ROUTER_URL=http://localhost:20128
Environment=NINE_ROUTER_MOCK=0
ExecStart=/usr/bin/npm start
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now 9router-pulse
```

### pm2 (alternatif)

```bash
pm2 start npm --name 9router-pulse -- start
pm2 save
```

### Docker

```bash
docker build -t 9router-pulse .
docker run -d --name 9router-pulse -p 3210:3210 \
  -e NINE_ROUTER_URL=http://host.docker.internal:20128 \
  9router-pulse
```

Atau pakai Compose (sudah termasuk `extra_hosts` agar `host.docker.internal` bekerja juga di Linux):

```bash
docker compose up -d --build
```

Override alamat 9Router lewat environment atau file `.env` untuk Compose:

```env
NINE_ROUTER_URL=https://node-xxx.tailxxxxx.ts.net
```

Catatan container: 9Router yang berjalan di mesin host dijangkau lewat `host.docker.internal`; instance di jaringan lain cukup isi URL-nya seperti biasa.

### HTTPS / reverse proxy

Jika Pulse ditaruh di belakang reverse proxy (Caddy/Nginx/Tailscale Serve), pastikan WebSocket/SSE diizinkan pada `/api/live/stream` (buffering dimatikan) dan set `NINE_ROUTER_COOKIE_SECURE=true`.

## Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| `Tidak bisa terhubung ke 9Router. Periksa URL dan Tailscale.` | URL salah, service 9Router mati, atau Tailscale tidak aktif di salah satu sisi. Uji dengan `curl` ke `/api/auth/status`. |
| `9Router tidak merespons. Periksa koneksi Tailscale.` | Koneksi ada tapi lambat/diam >15 dtk (kuota: >45 dtk). Cek beban instance/jaringan. |
| `Sesi 9Router sudah berakhir. Silakan masuk ulang.` | Cookie 24 jam habis atau sesi dicabut dari sisi 9Router. Masuk ulang. |
| `NINE_ROUTER_URL belum diatur di .env.local.` | File `.env.local` belum dibuat/terisi. Ulangi langkah `cp`. |
| Login gagal dengan pesan rate limit (`retryAfter`) | Terlalu banyak percobaan login di 9Router. Tunggu sesuai pesan lalu coba lagi. |
| Halaman **Request** kosong padahal ada trafik | Observability 9Router nonaktif atau riwayatnya sudah tergilas. Aktifkan lewat **Profil → Observability** (opsi `enableObservability`, bawaan mati) atau env `ENABLE_REQUEST_LOGS=true`; `OBSERVABILITY_ENABLED=false` mematikan paksa. Retensi terbatas: default pengaturan 1000 record (fallback 200), ubah lewat `observabilityMaxRecords` / env `OBSERVABILITY_MAX_RECORDS`. |
| Port 3210 sudah dipakai (`EADDRINUSE`) | Ubah `-p 3210` di script `dev`/`start` pada `package.json`. |
| Dev server reload berulang tanpa henti | Workaround untuk bug Turbopack sudah aktif di `next.config.ts` (`experimental.turbopackFileSystemCacheForDev: false`). Jangan hapus sampai [vercel/next.js#100267](https://github.com/vercel/next.js/issues/100267) diperbaiki upstream. |
| Cookie tidak “nyangkut” saat diakses lewat HTTPS | Set `NINE_ROUTER_COOKIE_SECURE=true` lalu restart. |
| Grafik/statistik “Hari ini” kosong | 9Router belum mencatat penggunaan pada periode itu, atau periode terlalu sempit. Ganti ke 7 hari untuk memastikan data mengalir. |

## Memperbarui

```bash
git pull
npm install
npm run build   # untuk mode produksi
```

## Keamanan & batasan

- Pulse **read-only**: tidak ada aksi yang mengubah konfigurasi 9Router.
- Password tidak pernah ditulis ke disk, tidak dilog, dan tidak dikirim ke browser.
- Cookie sesi `httpOnly`, `sameSite=lax`, umur 24 jam.
- Aplikasi ini dirancang untuk dipakai sendiri (localhost/VPN). Jika ingin mengekspos ke internet, tambahkan lapisan autentikasi tambahan di depannya (basic auth di reverse proxy, Cloudflare Access, dsb.) dan aktifkan `NINE_ROUTER_COOKIE_SECURE`.
