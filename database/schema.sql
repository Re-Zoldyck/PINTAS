-- ============================================================================
-- PINTAS — skema database (PostgreSQL)
-- Semua nama tabel/kolom snake_case; di kode TypeScript diakses lewat kysely
-- dengan CamelCasePlugin (display_name -> displayName), lihat helpers/db.tsx.
-- ============================================================================

-- ---------- ENUM ----------
CREATE TYPE user_role AS ENUM ('admin', 'creator', 'owner');
CREATE TYPE social_platform AS ENUM ('tiktok','instagram','youtube','facebook','x');
CREATE TYPE campaign_platform AS ENUM ('any','tiktok','instagram','youtube','facebook','x');
CREATE TYPE campaign_status AS ENUM ('draft','active','completed','expired');
CREATE TYPE duplicate_policy AS ENUM ('need_review','fail');
CREATE TYPE participant_status AS ENUM ('active','stopped');
CREATE TYPE submission_status AS ENUM (
  'draft','submitted','ai_verifying','ai_passed','ai_failed','need_admin_review',
  'admin_approved','admin_rejected','disputed','claimable','claimed','paid'
);
CREATE TYPE ai_result AS ENUM ('pass','fail','need_review');
CREATE TYPE dispute_status AS ENUM ('pending','accepted','rejected');
CREATE TYPE claim_status AS ENUM ('pending','paid','rejected');

-- ---------- AUTH (dibuat oleh scaffold auth Floot, ditambah bio & is_active) ----------
CREATE TABLE users (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'creator',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  bio text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE user_passwords (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,           -- bcrypt (bcryptjs, 10 rounds)
  created_at timestamptz DEFAULT now()
);

CREATE TABLE sessions (
  id text PRIMARY KEY,                   -- random 32 byte hex, disimpan di cookie JWT
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE login_attempts (
  id serial PRIMARY KEY,
  email varchar NOT NULL,
  attempted_at timestamp DEFAULT CURRENT_TIMESTAMP,
  success boolean DEFAULT false
);
CREATE INDEX login_attempts_email_idx ON login_attempts(email, attempted_at);

-- ---------- PROFIL CREATOR ----------
CREATE TABLE creator_social_accounts (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  handle text NOT NULL,                  -- tanpa "@", huruf kecil
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

-- ---------- CAMPAIGN ----------
CREATE TABLE campaigns (
  id serial PRIMARY KEY,
  owner_id integer NOT NULL REFERENCES users(id),
  name text NOT NULL,
  description text NOT NULL,
  budget_total bigint NOT NULL CHECK (budget_total >= 4000000),          -- min Rp4.000.000
  budget_used bigint NOT NULL DEFAULT 0 CHECK (budget_used >= 0),        -- sudah dibayar
  budget_reserved bigint NOT NULL DEFAULT 0 CHECK (budget_reserved >= 0),-- disetujui, belum dibayar
  status campaign_status NOT NULL DEFAULT 'draft',
  start_date date NOT NULL,
  end_date date NOT NULL,
  target text NOT NULL,
  target_views integer,
  required_platform campaign_platform NOT NULL DEFAULT 'any',
  watermark_required boolean NOT NULL DEFAULT false,
  watermark_logo_url text,
  watermark_logo_filename text,
  min_views integer NOT NULL DEFAULT 0,
  duplicate_policy duplicate_policy NOT NULL DEFAULT 'need_review',
  required_caption text,                 -- kata/kalimat wajib, dipisah koma
  required_hashtags text[] NOT NULL DEFAULT '{}',
  editing_requirement text,
  rate_per_thousand_views bigint NOT NULL DEFAULT 0 CHECK (rate_per_thousand_views >= 0),
  fee_per_submission bigint NOT NULL DEFAULT 0 CHECK (fee_per_submission >= 0),
  max_payout_per_submission bigint NOT NULL DEFAULT 0 CHECK (max_payout_per_submission >= 0), -- 0 = tanpa batas
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_budget_not_exceeded CHECK (budget_used + budget_reserved <= budget_total)
);
CREATE INDEX campaigns_owner_idx ON campaigns(owner_id);
CREATE INDEX campaigns_status_idx ON campaigns(status);

CREATE TABLE campaign_participants (
  id serial PRIMARY KEY,
  campaign_id integer NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status participant_status NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz,
  UNIQUE (campaign_id, creator_id)
);
CREATE INDEX campaign_participants_creator_idx ON campaign_participants(creator_id);

-- ---------- SUBMISSION ----------
CREATE TABLE submissions (
  id serial PRIMARY KEY,
  campaign_id integer NOT NULL REFERENCES campaigns(id),
  creator_id integer NOT NULL REFERENCES users(id),
  sequence_no integer NOT NULL,          -- nomor urut per campaign per creator (#001, #002, ...)
  title text NOT NULL,
  content_url text NOT NULL,
  content_fingerprint text NOT NULL,     -- URL ternormalisasi untuk deteksi duplikat/reupload
  platform social_platform NOT NULL,
  account_handle text NOT NULL,
  caption text NOT NULL DEFAULT '',
  hashtags text[] NOT NULL DEFAULT '{}',
  views_claimed integer NOT NULL DEFAULT 0 CHECK (views_claimed >= 0),
  verified_views integer,                -- diisi Admin saat persetujuan
  proof_screenshot_filename text,        -- key storage (private)
  watermark_applied boolean NOT NULL DEFAULT false,
  editing_confirmed boolean NOT NULL DEFAULT false,
  creator_notes text,
  status submission_status NOT NULL DEFAULT 'draft',
  ai_result ai_result,
  ai_checks jsonb,                       -- array {key,label,status,detail}
  ai_summary text,
  ai_verified_at timestamptz,
  admin_id integer REFERENCES users(id),
  admin_note text,
  admin_decided_at timestamptz,
  calculated_amount bigint,              -- hasil aturan pembayaran
  approved_amount bigint,                -- yang dialokasikan (dibatasi sisa budget)
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id, sequence_no)
);
CREATE INDEX submissions_fingerprint_idx ON submissions(content_fingerprint);
CREATE INDEX submissions_campaign_idx ON submissions(campaign_id);
CREATE INDEX submissions_creator_idx ON submissions(creator_id);
CREATE INDEX submissions_status_idx ON submissions(status);

-- ---------- SANGGAHAN ----------
CREATE TABLE disputes (
  id serial PRIMARY KEY,
  submission_id integer NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  creator_id integer NOT NULL REFERENCES users(id),
  reason text NOT NULL,
  evidence_filename text,
  status dispute_status NOT NULL DEFAULT 'pending',
  admin_id integer REFERENCES users(id),
  admin_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX disputes_submission_idx ON disputes(submission_id);
CREATE INDEX disputes_status_idx ON disputes(status);

-- ---------- CLAIM / PEMBAYARAN ----------
CREATE TABLE claims (
  id serial PRIMARY KEY,
  submission_id integer NOT NULL REFERENCES submissions(id),
  campaign_id integer NOT NULL REFERENCES campaigns(id),
  creator_id integer NOT NULL REFERENCES users(id),
  amount bigint NOT NULL CHECK (amount >= 0),
  real_name text NOT NULL,               -- data pribadi: hanya Admin & creator pemilik
  phone text NOT NULL,
  bank_name text NOT NULL,
  bank_account_number text NOT NULL,
  bank_account_holder text NOT NULL,
  status claim_status NOT NULL DEFAULT 'pending',
  admin_id integer REFERENCES users(id),
  admin_note text,
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- satu claim aktif per submission (claim ganda ditolak di level database)
CREATE UNIQUE INDEX claims_one_active_per_submission ON claims(submission_id) WHERE status <> 'rejected';
CREATE INDEX claims_creator_idx ON claims(creator_id);
CREATE INDEX claims_campaign_idx ON claims(campaign_id);
CREATE INDEX claims_status_idx ON claims(status);

-- ---------- AUDIT LOG ----------
CREATE TABLE audit_logs (
  id serial PRIMARY KEY,
  actor_id integer REFERENCES users(id),
  actor_role text,                       -- owner | creator | admin | ai | system
  entity_type text NOT NULL,             -- campaign | submission | user | ...
  entity_id integer NOT NULL,
  action text NOT NULL,
  from_status text,
  to_status text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_created_idx ON audit_logs(created_at DESC);
