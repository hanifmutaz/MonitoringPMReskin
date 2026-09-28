-- 1700000022000_add-setting-role-access.sql
--
-- Diminta lewat chat: "ada beberapa setting yang diperbolehkan untuk role
-- lain, tapi ga semua settingnya" — Settings selama ini hardcode
-- requireRole('Admin') TOTAL (lihat komentar migration 1700000011000 §
-- "Settings & User Management tetap Admin-only hardcode... terlalu
-- sensitif untuk dibuka granular di tahap ini"). Sekarang dibuka granular
-- PER-KEY, pola yang sama dengan role_permissions (migration 1700000011000):
-- Admin tetap selalu superuser (bypass total, TIDAK butuh row di sini -
-- sama seperti Admin di role_permissions), role lain HARUS ada grant
-- eksplisit per setting key baru boleh edit key itu. Default: TIDAK ADA
-- grant sama sekali (tabel kosong) - behavior existing (Admin-only) tetap
-- 100% sama sampai Admin eksplisit buka lewat UI baru.
--
-- Read (GET /settings) sengaja DIBUKA ke semua role yang sudah login (lihat
-- perubahan settingsRoutes.js terkait) - supaya role yang dikasih akses
-- edit ke sebagian setting tetap bisa lihat context 8 kategori lainnya
-- (read-only), sama pola dengan pmLineRoutes/pmPartRoutes (view-only untuk
-- semua role login). Write (PATCH) yang digranular di sini.

CREATE TABLE setting_role_access (
    setting_key     VARCHAR(100) NOT NULL REFERENCES app_settings(key) ON DELETE CASCADE,
    role_id         INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_by      INT REFERENCES users(id) ON DELETE SET NULL,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (setting_key, role_id)
);

COMMENT ON TABLE setting_role_access IS 'Grant akses EDIT (bukan read) per app_settings.key ke role non-Admin. Admin tidak butuh row (superuser, sama seperti role_permissions). Role "Operator" tetap ikut aturan ini juga (bukan default free-access) - konsisten dgn role custom lain.';

CREATE INDEX idx_setting_role_access_role ON setting_role_access(role_id);
