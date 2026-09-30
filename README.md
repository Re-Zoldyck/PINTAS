# PINTAS — versi mandiri untuk Vercel

Platform campaign konten digital: Owner membuat campaign berbudget → Creator mengirim konten sebagai
submission → mesin verifikasi berbasis aturan (PASS / FAIL / NEED REVIEW) → konfirmasi Admin → claim →
pembayaran, tanpa pernah melebihi budget. Antarmuka Bahasa Indonesia.

Proyek ini adalah porting dari versi Floot menjadi proyek standar yang bisa di-deploy ke **Vercel**
(atau hosting Node lain) dengan domain sendiri.

Stack: Vite + React 19 + TypeScript + CSS Modules (frontend) · Vercel Serverless Function
(`api/index.ts`) yang meneruskan ke endpoint web-standard di `src/endpoints` · PostgreSQL via
kysely · Vercel Blob untuk file bukti/logo.

## Struktur

```
pintas-vercel/
├── api/index.ts             # satu fungsi serverless: /_api/<route> → src/endpoints/<route>_<METHOD>.ts
├── src/
│   ├── main.tsx, App.tsx    # entry Vite + React Router
│   ├── routes.generated.tsx # DIBUAT OTOMATIS dari src/pages (npm run gen:routes)
│   ├── server/routes.ts     # DIBUAT OTOMATIS: registry endpoint "route:METHOD" → handle()
│   ├── pages/               # halaman (nama file → path: creator.campaigns.$campaignId → /creator/campaigns/:campaignId)
│   │   └── *.pageLayout.tsx # pembungkus halaman: [RoleRoute, AppShell]
│   ├── components/, helpers/, endpoints/   # sama seperti versi Floot (lihat docs/API.md)
│   └── base.css
├── database/schema.sql, seed_demo.sql
├── scripts/generate-routes.mjs
├── vercel.json, vite.config.ts, tsconfig.json, .env.example
```

## Perbedaan dengan versi Floot

| Floot | Di proyek ini |
|---|---|
| Routing nama file oleh platform | `scripts/generate-routes.mjs` membaca `src/pages` → React Router (`src/routes.generated.tsx`) |
| Endpoint `handle(request)` dijalankan platform | `api/index.ts` mengubah req/res Node menjadi `Request`/`Response` lalu memanggil `handle` |
| `@floot/storage` presigned URL | Upload multipart lewat `/_api/uploads/presign` → `@vercel/blob` (`put`, akses publik, nama acak). Nilai yang disimpan di kolom `*_filename` adalah URL blob. Batas 4 MB per file. |
| `@floot/realtime` (WebSocket) | Dihapus. `helpers/useLiveUpdates.tsx` me-refresh cache React Query tiap 15 detik + saat tab fokus/online. `helpers/realtimeNotify.tsx` menjadi no-op (bisa diganti Pusher/Ably). |
| `FLOOT_DATABASE_URL` | `DATABASE_URL` |
| Cookie `floot_built_app_session` | `pintas_session` (flag `Secure` otomatis nonaktif saat dev lokal) |
| Unit test Jasmine | Vitest (`npm test`) — file `*.spec.tsx` tidak berubah |

## Deploy ke Vercel (langkah demi langkah)

1. **Database PostgreSQL.** Paling mudah: di dashboard Vercel → *Storage* → *Create Database* → **Neon**
   (Postgres). Salin connection string-nya (`postgresql://...?sslmode=require`). Alternatif: Supabase,
   Railway, atau Postgres sendiri.
2. **Buat tabel & data demo.** Jalankan `database/schema.sql` lalu `database/seed_demo.sql` di SQL editor
   Neon, atau dari terminal:
   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   psql "$DATABASE_URL" -f database/seed_demo.sql
   ```
3. **Vercel Blob.** Dashboard Vercel → *Storage* → *Create* → **Blob**. Hubungkan ke proyek; env
   `BLOB_READ_WRITE_TOKEN` akan otomatis ditambahkan.
4. **Push kode ke GitHub/GitLab/Bitbucket**, lalu di Vercel *Add New Project* → import repo.
   Framework terdeteksi sebagai Vite; biarkan build command `npm run build`, output `dist`.
5. **Environment Variables** (Settings → Environment Variables, untuk Production & Preview):
   - `DATABASE_URL` — connection string Postgres
   - `JWT_SECRET` — string acak panjang (`openssl rand -hex 32`)
   - `BLOB_READ_WRITE_TOKEN` — dari langkah 3
6. **Deploy.** Setelah selesai, buka URL proyek dan login dengan akun demo di bawah.
7. **Domain sendiri.** Settings → Domains → tambahkan domain, lalu arahkan DNS (CNAME `cname.vercel-dns.com`
   atau A record yang ditunjukkan Vercel).

Alternatif lewat CLI: `npm i -g vercel && vercel` (ikuti prompt), set env dengan `vercel env add`, lalu
`vercel --prod`.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env        # isi DATABASE_URL, JWT_SECRET, BLOB_READ_WRITE_TOKEN
npm i -g vercel
vercel dev                  # menjalankan frontend Vite + fungsi api/ di http://localhost:3000
```
`vercel dev` membaca `.env` secara otomatis. Perintah lain: `npm run typecheck`, `npm test`, `npm run build`.
(Jika hanya `npm run dev`, Vite jalan di :5173 dan mem-proxy `/_api` ke `vercel dev` di :3000.)

Untuk Postgres lokal tanpa SSL, gunakan host `localhost` di `DATABASE_URL` (SSL otomatis dimatikan di
`src/helpers/db.tsx`).

## Akun demo (password: `pintas123`)

| Peran   | Email              |
|---------|--------------------|
| Admin   | admin@pintas.id    |
| Owner   | owner@pintas.id, owner2@pintas.id |
| Creator | creator@pintas.id, creator2@pintas.id, creator3@pintas.id |

Admin baru hanya bisa dibuat lewat SQL (`UPDATE users SET role='admin' WHERE email=...`) atau halaman
Admin → Pengguna.

## Catatan

- **Privasi file bukti.** Vercel Blob hanya menyediakan akses publik lewat URL. URL dibuat acak dan
  hanya dikirim ke Admin serta creator pemiliknya lewat API, tidak pernah ditampilkan ke Owner.
  Bila butuh file benar-benar privat, ganti `src/endpoints/uploads/presign_POST.ts` dan
  `src/helpers/storageUrls.tsx` dengan S3/R2 presigned URL.
- **Ukuran unggahan** dibatasi 4 MB karena batas body Vercel Serverless Function (≈4,5 MB). Untuk file
  lebih besar gunakan client upload `@vercel/blob/client` (`handleUpload`).
- **Batas waktu fungsi** memakai default Vercel. Bila perlu lebih lama, tambahkan `"functions": {"api/index.ts": {"maxDuration": 30}}` di `vercel.json`.
- **Menambah halaman/endpoint**: buat file di `src/pages` atau `src/endpoints` mengikuti pola nama, lalu
  `npm run gen:routes` (otomatis dijalankan pada `dev`/`build`).
- Logika inti (mesin verifikasi, ledger budget, alur status, rumus pembayaran) tidak berubah — lihat
  `docs/API.md`.
