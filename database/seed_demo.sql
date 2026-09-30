-- ============================================================================
-- PINTAS — data demo (akun + campaign contoh). Jalankan setelah schema.sql.
-- Password semua akun: pintas123  (hash bcrypt di bawah dibuat dengan bcryptjs, 10 rounds)
-- ============================================================================

INSERT INTO users (id, email, display_name, role, bio) VALUES
  (1, 'admin@pintas.id',    'Admin PINTAS',           'admin',   'Tim verifikasi & pembayaran PINTAS'),
  (2, 'owner@pintas.id',    'Rina — Kopi Nusantara',  'owner',   'Brand kopi lokal, fokus konten TikTok'),
  (3, 'owner2@pintas.id',   'Andi — Glow Skincare',   'owner',   'Skincare lokal, kolaborasi micro-creator Instagram'),
  (4, 'creator@pintas.id',  'Dimas Pratama',          'creator', 'Food & lifestyle creator, 45K followers TikTok'),
  (5, 'creator2@pintas.id', 'Sarah Amelia',           'creator', 'Daily vlog & review jujur'),
  (6, 'creator3@pintas.id', 'Bayu Santoso',           'creator', 'Kuliner Bandung, Instagram reels');
SELECT setval('users_id_seq', 6);

INSERT INTO user_passwords (user_id, password_hash)
SELECT id, '$2b$10$5DvVMQA8V5TaTwwCDeOMFer/rQykRoyPtyLlxw2YLtBUNOV2Dd7RO' FROM users;

INSERT INTO creator_social_accounts (user_id, platform, handle) VALUES
  (4, 'tiktok',    'dimas.creates'),
  (4, 'instagram', 'dimas.creates'),
  (4, 'youtube',   'dimascreates'),
  (5, 'tiktok',    'sarahvlogs'),
  (5, 'instagram', 'sarah.amelia'),
  (6, 'instagram', 'bayueats'),
  (6, 'tiktok',    'bayueats');

INSERT INTO campaigns (owner_id, name, description, budget_total, start_date, end_date, target, target_views,
  required_platform, watermark_required, min_views, duplicate_policy, required_caption, required_hashtags,
  editing_requirement, rate_per_thousand_views, fee_per_submission, max_payout_per_submission, status) VALUES
  (2, 'Kopi Nusantara — Rasa Pagi Indonesia',
   'Konten TikTok yang menampilkan momen ngopi pagi dengan produk Kopi Nusantara. Tunjukkan kemasan, proses seduh, dan reaksi jujur. Konten harus terasa natural, bukan iklan kaku.',
   4000000, '2026-09-01', '2026-11-30', '100.000 total views dari minimal 20 konten TikTok selama periode campaign', 100000,
   'tiktok', true, 1000, 'need_review', 'Kopi Nusantara', '{kopinusantara,rasapagi}',
   'Sertakan cuplikan produk minimal 3 detik dan ajakan mencoba (call to action) di akhir video. Durasi 20-60 detik.',
   15000, 50000, 400000, 'active'),
  (3, 'Glow Skincare — 7 Hari Bersinar',
   'Review jujur pemakaian serum Glow selama 7 hari dalam format Instagram Reels. Tampilkan before-after dan rutinitas pagi/malam.',
   6000000, '2026-09-15', '2026-12-15', '60 reels dengan total 150.000 views', 150000,
   'instagram', false, 500, 'fail', 'Glow Skincare', '{glow7hari,glowskincare}',
   NULL, 10000, 75000, 300000, 'active'),
  (2, 'Kopi Nusantara — Kedai Series',
   'Seri konten kunjungan ke kedai mitra Kopi Nusantara di 5 kota. Masih dalam penyusunan requirement.',
   4500000, '2026-12-01', '2027-01-31', '25 konten kunjungan kedai', 50000,
   'any', false, 0, 'need_review', NULL, '{kedaikopinusantara}',
   NULL, 12000, 40000, 0, 'draft');

-- Catatan: campaign pertama mewajibkan watermark. Unggah logo PNG lewat halaman
-- "Edit campaign" (Owner) agar watermark_logo_url terisi sebelum diaktifkan ulang.
