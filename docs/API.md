# PINTAS — Referensi API

Semua endpoint berada di `src/endpoints/<route>_<METHOD>.ts` dan dipanggil di `/_api/<route>` (di Vercel diteruskan ke fungsi `api/index.ts`).
Setiap endpoint punya file `.schema.ts` berisi zod schema input, tipe output, dan fungsi fetch
bertipe (`getXxx` / `postXxx`) yang dipakai oleh hook React Query di `helpers/use*.tsx`.
Body dan respons dibungkus dengan `superjson` (Date tetap menjadi `Date`). Error dikembalikan
sebagai `{ error: string }` dengan status HTTP 400/401/403/404/409/500.

Otorisasi: `helpers/apiUtils.tsx › requireUser(request, roles?)` membaca cookie sesi
(`pintas_session`, JWT yang berisi id sesi) dan menolak peran yang tidak berhak.

| Route | Method | Peran | Fungsi |
|---|---|---|---|
| `auth/register_with_password` | POST | publik | Daftar sebagai `owner` atau `creator` (admin hanya via SQL). |
| `auth/login_with_password` | POST | publik | Login (rate-limit 5 percobaan / 15 menit). |
| `auth/logout` | POST | login | Hapus sesi. |
| `auth/session` | GET | login | Sesi saat ini (dipakai `AuthProvider`). |
| `profile/me` | GET | login | Profil + akun sosial terdaftar. |
| `profile/update` | POST | login | Ubah nama tampilan, bio, akun sosial (satu per platform). |
| `uploads/presign` | POST | login | Upload multipart (`kind`, `file`, maks. 4 MB) ke Vercel Blob: `proof`/`dispute` (creator), `watermark` (owner, PNG). Mengembalikan URL file. |
| `campaigns/list` | GET | semua | Owner: campaign miliknya. Creator: `scope=available` (aktif) atau `scope=joined`. Admin: semua. |
| `campaigns/detail` | GET | semua | Campaign + submission (creator: miliknya; owner/admin: semua) + peserta + aktivitas. |
| `campaigns/save` | POST | owner | Buat/ubah campaign. Draft: semua field. Aktif: hanya nama, deskripsi, target, tanggal berakhir, catatan editing. `publish:true` = langsung aktif. |
| `campaigns/status` | POST | owner/admin | `activate` (draft→active), `complete` (active→completed), `add_budget` (tambah budget; mengaktifkan kembali campaign yang selesai). |
| `campaigns/participation` | POST | creator | `join` / `leave` (creator bebas berhenti kapan saja). |
| `submissions/list` | GET | semua | Filter `campaignId`, `status`, `group` (`pending`,`review`,`confirm`,`claimable`,`all`). |
| `submissions/detail` | GET | semua | Detail lengkap: hasil AI per item, sanggahan, claim, riwayat audit, URL bukti (presigned). Data pribadi claim hanya untuk Admin & creator pemilik. |
| `submissions/save` | POST | creator | `action:"save_draft"` atau `"submit"`. Submit menjalankan mesin verifikasi (`helpers/aiVerification.tsx`) → `ai_passed` / `ai_failed` / `need_admin_review`. |
| `disputes/create` | POST | creator | Sanggahan atas hasil `ai_failed` → status `disputed`. |
| `disputes/list` | GET | semua | Admin: semua; creator: miliknya; owner: campaign miliknya. |
| `admin/review_submission` | POST | admin | `approve` (hitung payout, alokasikan budget dengan cap, → `claimable`) atau `reject` (catatan wajib). |
| `admin/decide_dispute` | POST | admin | `accept` (= approve) / `reject` (= reject) sanggahan. |
| `claims/create` | POST | creator | Claim submission `claimable` dengan nama asli, HP, rekening → `claimed`. Claim ganda ditolak. |
| `claims/list` | GET | semua | Creator: miliknya (dengan data pribadi). Owner: tanpa data pribadi. Admin: lengkap. |
| `admin/confirm_payment` | POST | admin | `paid` (reserved→used, submission `paid`) atau `reject` (kembali `claimable`). |
| `admin/users` | GET | admin | Daftar pengguna + statistik. |
| `admin/update_user` | POST | admin | Ubah peran / aktif-nonaktif (nonaktif = sesi dihapus). |
| `admin/audit_logs` | GET | admin | Audit log dengan filter `entityType`, `entityId`, paginasi. |
| `dashboard/summary` | GET | semua | Ringkasan dashboard sesuai peran (`role: owner | creator | admin`). |


## Alur status submission

```
draft → submitted → ai_verifying → ai_passed | ai_failed | need_admin_review
ai_failed → disputed (sanggahan creator)
ai_passed / ai_failed / need_admin_review / disputed → admin_approved → claimable   (Admin setuju; budget dialokasikan)
ai_passed / ai_failed / need_admin_review / disputed → admin_rejected               (Admin tolak; final)
claimable → claimed (creator claim) → paid (Admin konfirmasi)   |   claimed → claimable (claim ditolak Admin)
```

## Perhitungan pembayaran (`helpers/payout.tsx`)

`nominal = fee_per_submission + floor(views_terverifikasi × rate_per_thousand_views / 1000)`,
dibatasi `max_payout_per_submission` (jika > 0), lalu dibatasi **sisa budget campaign**
(`budget_total − budget_used − budget_reserved`) saat Admin menyetujui (`helpers/budgetLedger.tsx`).
Saat pembayaran dikonfirmasi, nominal berpindah dari `budget_reserved` ke `budget_used`.
Campaign otomatis `completed` ketika budget habis.
