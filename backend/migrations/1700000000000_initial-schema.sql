-- ============================================================
-- 1700000000000_initial-schema.sql
-- PM Monitoring Web App — PostgreSQL DDL (Migration #1)
-- Sumber: 04_DATABASE_SCHEMA.sql (versi final yang di-lock)
--
-- CATATAN: node-pg-migrate SUDAH OTOMATIS membungkus tiap file migration
-- dalam 1 transaksi sendiri. TIDAK ADA BEGIN/COMMIT eksplisit di sini
-- (beda dari 04_DATABASE_SCHEMA.sql aslinya yang berdiri sendiri) — kalau
-- ditambah, terjadi nested transaction yang rawan bikin state gak
-- konsisten kalau migration ke-interrupt di tengah jalan (COMMIT eksplisit
-- di dalam bisa nutup transaksi lebih awal daripada yang diharapkan
-- node-pg-migrate, sehingga rollback otomatis saat error jadi gak
-- lengkap). Kalau butuh jalanin file SQL ini di luar node-pg-migrate
-- (manual psql), bungkus sendiri dengan BEGIN;...COMMIT; saat itu.
--
-- CATATAN DEVIASI TERDOKUMENTASI (disetujui pemilik project, 12 Jul 2026):
--   1. Tabel `parts`: kolom `inventory_ref_note` (VARCHAR(255) bebas teks)
--      diganti jadi 4 kolom terstruktur: spare_part_number, spare_part_qty,
--      spare_part_location, spare_part_note. Alasan: kebutuhan referensi
--      spare part manual (integrasi Inventory ditunda) butuh field yang bisa
--      dipisah/dicari per komponen, bukan 1 blok teks bebas.
--   2. Tabel `lines`: ditambah kolom nullable `auto_reset_weekly_on_monthly`
--      sebagai override per-Line. NULL = ikut setting global di app_settings
--      (key: auto_reset_weekly_on_monthly). Alasan: tidak semua Line punya
--      pola siklus Weekly-ke-4-menyatu-Monthly yang sama (dikonfirmasi
--      pemilik project) — setting global saja tidak cukup merepresentasikan
--      kondisi nyata.
-- Semua tabel/kolom lain IDENTIK dengan 04_DATABASE_SCHEMA.sql, tidak diubah.
-- ============================================================

-- ============================================================
-- 1. ROLES
-- ============================================================
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE   -- 'Admin' / 'Operator' (bisa ditambah role baru tanpa ubah struktur)
);

COMMENT ON TABLE roles IS 'Daftar role. Saat ini Admin & Operator; dirancang agar role baru bisa ditambah tanpa migrasi struktur (cukup INSERT row baru).';

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    full_name       VARCHAR(100) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);

COMMENT ON TABLE users IS 'Akun pengguna sistem (Admin & Operator)';

-- ============================================================
-- 3. APP_SETTINGS  (key-value config bisnis — 7 kategori)
-- ============================================================
CREATE TABLE app_settings (
    key             VARCHAR(100) PRIMARY KEY,
    value           TEXT NOT NULL,
    value_type      VARCHAR(20) NOT NULL CHECK (value_type IN ('number','boolean','text')),
    category        VARCHAR(50) NOT NULL,
    description     TEXT,
    updated_by      INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_settings_category ON app_settings(category);

COMMENT ON TABLE app_settings IS 'Konfigurasi bisnis (threshold, skema poin, sync interval, dst) — jangan hardcode di kode aplikasi';

-- ============================================================
-- 4. LINES
-- ============================================================
CREATE TABLE lines (
    id                              SERIAL PRIMARY KEY,
    line_name                       VARCHAR(50) NOT NULL UNIQUE,
    is_active                       BOOLEAN NOT NULL DEFAULT TRUE,
    auto_reset_weekly_on_monthly    BOOLEAN DEFAULT NULL, -- [DEVIASI #2] NULL = ikut global app_settings
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE lines IS 'Daftar line produksi internal Hirose';
COMMENT ON COLUMN lines.auto_reset_weekly_on_monthly IS '[DEVIASI TERDOKUMENTASI] Override per-Line terhadap setting global auto_reset_weekly_on_monthly di app_settings. NULL = ikut global, TRUE/FALSE = override eksplisit untuk Line ini. Ditambahkan karena tidak semua Line punya pola siklus Weekly-menyatu-Monthly yang sama.';

-- ============================================================
-- 5. PARTS  (1 row per Line + Drawing No — unit monitoring PM Part)
-- ============================================================
CREATE TABLE parts (
    id                    SERIAL PRIMARY KEY,
    line_id               INT NOT NULL REFERENCES lines(id) ON DELETE RESTRICT,
    drawing_no            VARCHAR(100) NOT NULL,
    part_name             VARCHAR(150) NOT NULL,
    target_shot           BIGINT NOT NULL CHECK (target_shot > 0),
    spare_part_number     VARCHAR(100),           -- [DEVIASI #1] pengganti inventory_ref_note
    spare_part_qty        INT CHECK (spare_part_qty IS NULL OR spare_part_qty >= 0),
    spare_part_location   VARCHAR(150),
    spare_part_note       TEXT,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_parts_line_drawing UNIQUE (line_id, drawing_no)
);

CREATE INDEX idx_parts_line_id ON parts(line_id);
CREATE INDEX idx_parts_drawing_no ON parts(drawing_no);
CREATE INDEX idx_parts_is_active ON parts(is_active);

COMMENT ON TABLE parts IS 'Part fisik per Line, diidentifikasi oleh Drawing No (unique per line). Target Shot tetap per part fisik, tidak berbeda per CL No.';
COMMENT ON COLUMN parts.drawing_no IS 'Disiapkan sebagai join key untuk integrasi Inventory di masa depan (lihat MASTER DOCUMENT Bagian 1)';
COMMENT ON COLUMN parts.spare_part_number IS '[DEVIASI TERDOKUMENTASI] Referensi spare part manual terstruktur, pengganti kolom inventory_ref_note di skema asli — integrasi Inventory system sesungguhnya masih ditunda.';

-- ============================================================
-- 6. PART_CL_MAPPING  (many-to-many Part <-> CL No)
-- ============================================================
CREATE TABLE part_cl_mapping (
    id              SERIAL PRIMARY KEY,
    part_id         INT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    cl_no           VARCHAR(50) NOT NULL,
    product_name    VARCHAR(150),
    jig_name        VARCHAR(150),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_part_cl_mapping UNIQUE (part_id, cl_no)
);

CREATE INDEX idx_part_cl_mapping_part_id ON part_cl_mapping(part_id);
CREATE INDEX idx_part_cl_mapping_cl_no ON part_cl_mapping(cl_no);

COMMENT ON TABLE part_cl_mapping IS 'Relasi: 1 part fisik bisa dipakai di banyak CL No dalam 1 line yang sama (ganti model/varian)';

-- ============================================================
-- 7. PM_PART_HISTORY  (riwayat penggantian part)
-- ============================================================
CREATE TABLE pm_part_history (
    id                      SERIAL PRIMARY KEY,
    part_id                 INT NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
    tgl_ganti               DATE NOT NULL,
    shift                   SMALLINT CHECK (shift IN (1,2,3)),
    counter_saat_diganti    BIGINT NOT NULL CHECK (counter_saat_diganti >= 0),
    jenis_penggantian       VARCHAR(20) NOT NULL CHECK (jenis_penggantian IN ('BROKEN','PM_EARLY','TERJADWAL')),
    remark                  TEXT,
    user_id                 INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_part_history_part_tgl ON pm_part_history(part_id, tgl_ganti DESC);
CREATE INDEX idx_pm_part_history_user_id ON pm_part_history(user_id);

COMMENT ON TABLE pm_part_history IS 'Riwayat penggantian part. tgl_ganti terbaru per part_id dipakai sebagai basis perhitungan counter (lihat MASTER DOCUMENT Bagian 2.A)';

-- ============================================================
-- 8. PRODUCTION_CACHE  (hasil sync read-only dari DB ConMas)
-- ============================================================
CREATE TABLE production_cache (
    id              BIGSERIAL PRIMARY KEY,
    line_id         INT NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
    cl_no           VARCHAR(50) NOT NULL,
    tanggal         DATE NOT NULL,
    output_actual   BIGINT NOT NULL DEFAULT 0 CHECK (output_actual >= 0),
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_production_cache UNIQUE (line_id, cl_no, tanggal)
);

CREATE INDEX idx_production_cache_line_cl_tgl ON production_cache(line_id, cl_no, tanggal);
CREATE INDEX idx_production_cache_tanggal ON production_cache(tanggal);

COMMENT ON TABLE production_cache IS 'Cache lokal hasil sync read-only dari DB ConMas. UNIQUE constraint mencegah duplikat entry saat sync job berjalan berkali-kali.';

-- ============================================================
-- 9. PM_MONTHLY_HELPER  (1 row per Line — status Monthly & Weekly)
-- ============================================================
CREATE TABLE pm_monthly_helper (
    id                          SERIAL PRIMARY KEY,
    line_id                     INT NOT NULL UNIQUE REFERENCES lines(id) ON DELETE CASCADE,
    tgl_pm_monthly_terakhir     DATE,
    tgl_pm_weekly_terakhir      DATE,
    akumulasi_poin_monthly      NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (akumulasi_poin_monthly >= 0),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE pm_monthly_helper IS '1 baris per Line. akumulasi_poin_monthly di-cap sesuai setting pm_monthly_point_cap (lihat MASTER DOCUMENT Bagian 2.B)';

-- ============================================================
-- 10. PM_MONTHLY_HISTORY  (riwayat input PM Monthly/Weekly)
-- ============================================================
CREATE TABLE pm_monthly_history (
    id              SERIAL PRIMARY KEY,
    line_id         INT NOT NULL REFERENCES lines(id) ON DELETE RESTRICT,
    tgl_input       DATE NOT NULL,
    jenis_pm        VARCHAR(10) NOT NULL CHECK (jenis_pm IN ('MONTHLY','WEEKLY')),
    keterangan      TEXT,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pm_monthly_history_line_tgl ON pm_monthly_history(line_id, tgl_input DESC);
CREATE INDEX idx_pm_monthly_history_jenis ON pm_monthly_history(jenis_pm);

COMMENT ON TABLE pm_monthly_history IS 'Submit jenis_pm=MONTHLY mereset tgl_pm_monthly_terakhir DAN (jika setting/override auto_reset_weekly_on_monthly=true) tgl_pm_weekly_terakhir. Submit WEEKLY hanya reset tgl_pm_weekly_terakhir.';

-- ============================================================
-- 11. INVENTORY_SYNC_LOG  (disiapkan, belum dipakai)
-- ============================================================
CREATE TABLE inventory_sync_log (
    id              SERIAL PRIMARY KEY,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          VARCHAR(20) NOT NULL CHECK (status IN ('success','fail')),
    rows_synced     INT DEFAULT 0,
    note            TEXT
);

COMMENT ON TABLE inventory_sync_log IS 'Disiapkan untuk integrasi Inventory di masa depan (ditunda — lihat MASTER DOCUMENT Bagian 1). Belum ada job yang menulis ke tabel ini di v1.0.';

-- ============================================================
-- 12. AUDIT_LOG  (jejak perubahan Master Data, Settings, User, History PM)
-- ============================================================
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    table_name      VARCHAR(50) NOT NULL,
    record_id       INT,
    action          VARCHAR(10) NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE')),
    old_value       JSONB,
    new_value       JSONB,
    user_id         INT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

COMMENT ON TABLE audit_log IS 'Dicatat dari Service layer (bukan trigger DB, bukan controller) — lihat 02_DEVELOPMENT_RULES.md Bagian 22';

-- ============================================================
-- SEED DATA — ROLES
-- ============================================================
INSERT INTO roles (name) VALUES ('Admin'), ('Operator');

-- ============================================================
-- SEED DATA — APP_SETTINGS
-- Sesuai 01_MASTER_DOCUMENT.md Bagian 4 (7 kategori)
-- ============================================================
INSERT INTO app_settings (key, value, value_type, category, description) VALUES
-- 1. Threshold PM Part
('pm_part_danger_multiplier',        '2',    'number',  'threshold_pm_part',      'Sisa Shot <= (x * Pemakaian/Hari) -> DANGER'),
('pm_part_warning_multiplier',       '6',    'number',  'threshold_pm_part',      'Sisa Shot < (x * Pemakaian/Hari) -> WARNING'),

-- 2. Skema Poin PM Monthly
('pm_monthly_point_full_run',        '1',    'number',  'skema_poin_monthly',     'Poin jika line running >=2x/hari'),
('pm_monthly_point_half_run',        '0.5',  'number',  'skema_poin_monthly',     'Poin jika line running 1x/hari'),
('pm_monthly_point_cap',             '30',   'number',  'skema_poin_monthly',     'Batas maksimal akumulasi poin'),
('pm_monthly_min_run_count_full',    '2',    'number',  'skema_poin_monthly',     'Ambang running/hari untuk dianggap full point'),

-- 3. Threshold Monthly & Weekly
('pm_monthly_danger_days',           '2',    'number',  'threshold_monthly_weekly', 'Sisa Hari Monthly <= ini -> DANGER'),
('pm_monthly_warning_days',          '5',    'number',  'threshold_monthly_weekly', 'Sisa Hari Monthly <= ini -> WARNING'),
('pm_weekly_total_days',             '7',    'number',  'threshold_monthly_weekly', 'Siklus PM Weekly (hari)'),
('pm_weekly_danger_days',            '2',    'number',  'threshold_monthly_weekly', 'Sisa Hari Weekly <= ini -> DANGER'),
('pm_weekly_warning_days',           '5',    'number',  'threshold_monthly_weekly', 'Sisa Hari Weekly <= ini -> WARNING'),

-- 4. Relasi Monthly <-> Weekly
('auto_reset_weekly_on_monthly',     'true', 'boolean', 'relasi_monthly_weekly',   'Default global PM Monthly ikut reset Weekly atau tidak (bisa di-override per Line lewat lines.auto_reset_weekly_on_monthly)'),

-- 5. Sync Data Produksi
('sync_interval_minutes',            '30',   'number',  'sync_data_produksi',      'Interval job sync ke DB ConMas'),
('sync_lookback_days',               '90',   'number',  'sync_data_produksi',      'Rentang hari ke belakang yang di-cache'),

-- 6. Dashboard & Tampilan
('dashboard_upcoming_pm_limit',      '10',   'number',  'dashboard_tampilan',      'Default jumlah item Upcoming PM'),
('dashboard_default_view',           'all',  'text',    'dashboard_tampilan',      'Filter default saat dashboard dibuka'),

-- 7. User & Role
('session_timeout_minutes',          '60',   'number',  'user_role',               'Auto-logout saat idle'),
('allow_operator_edit_master_data',  'false','boolean', 'user_role',               'Apakah role Operator boleh CRUD Master Data');
