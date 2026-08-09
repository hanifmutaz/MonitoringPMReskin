-- 1700000009000_add-user-approval.sql
--
-- Self-Registration + Approval Admin (Q1: login user PENDING/REJECTED
-- di-block TOTAL - dicek SEBELUM password di-verifikasi, konsisten dengan
-- pola is_active yang sudah ada di authService.login()).
--
-- PERUBAHAN:
--   1. `users.status` - PENDING (baru daftar sendiri, nunggu approval) /
--      APPROVED (bisa login normal) / REJECTED (ditolak Admin). User yang
--      SUDAH ADA sebelum migration ini otomatis APPROVED (DEFAULT) - supaya
--      tidak ada user existing yang tiba-tiba ke-lock keluar dari sistem.
--   2. `users.role_id` jadi NULLABLE - user PENDING belum py role sampai
--      Admin approve & pilih role-nya. role_id WAJIB diisi lagi begitu
--      status jadi APPROVED (dijaga di service layer, bukan CHECK constraint
--      DB, karena constraint lintas-kolom kondisional lebih gampang di-review
--      dan di-maintain di kode aplikasi - Development Rules §2 KISS).
--   3. `approved_by` / `approved_at` - audit trail siapa & kapan approve/reject.
--   4. login_audit_log.event_type CHECK constraint diperluas - ada 2 event
--      baru buat approval flow, dicatat internal untuk security audit,
--      TAPI pesan yang dikirim ke CLIENT tetap generik "Username atau
--      password salah" (konsisten dengan LOGIN_FAILED_ACCOUNT_DISABLED yang
--      sudah ada - tidak membocorkan status akun ke penyerang yang nebak
--      username, lihat SECURITY_REVIEW.md pola yang sudah dianut project ini).

ALTER TABLE users
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));

ALTER TABLE users ALTER COLUMN role_id DROP NOT NULL;

ALTER TABLE users ADD COLUMN approved_by INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN approved_at TIMESTAMPTZ;

CREATE INDEX idx_users_status ON users(status);

COMMENT ON COLUMN users.status IS 'PENDING = baru self-register, nunggu approval. APPROVED = bisa login normal. REJECTED = ditolak Admin, tidak bisa login. User lama (pre-migration) otomatis APPROVED.';
COMMENT ON COLUMN users.role_id IS 'NULLABLE sejak migration 1700000009000 - user berstatus PENDING belum punya role sampai di-approve Admin (Admin memilih role saat approve).';
COMMENT ON COLUMN users.approved_by IS 'User (Admin) yang meng-approve/reject akun ini. NULL kalau belum pernah diproses (masih PENDING) atau user lama dari sebelum fitur ini ada.';

-- Perluas CHECK constraint event_type di login_audit_log (nama constraint
-- auto-generate Postgres dari migration 1700000003000: <table>_<column>_check)
ALTER TABLE login_audit_log DROP CONSTRAINT login_audit_log_event_type_check;
ALTER TABLE login_audit_log ADD CONSTRAINT login_audit_log_event_type_check
    CHECK (event_type IN (
        'LOGIN_SUCCESS',
        'LOGIN_FAILED_USER_NOT_FOUND',
        'LOGIN_FAILED_INVALID_PASSWORD',
        'LOGIN_FAILED_ACCOUNT_DISABLED',
        'LOGIN_FAILED_PENDING_APPROVAL',
        'LOGIN_FAILED_REJECTED',
        'LOGOUT'
    ));
