-- 1700000008000_add-notifications.sql
--
-- Infrastruktur Notifikasi Email - TAHAP 1: trigger PM Part (status DANGER).
-- Notifikasi Inventory (status ORDER berdasar ROP) MENYUSUL setelah rumus
-- ROP/Safety Stock (Q2/Q3) fix - notification_type di bawah sengaja dibuat
-- extensible (CHECK constraint tinggal ditambah 'INVENTORY_ORDER' nanti).
--
-- Kenapa butuh migration ini:
--   1. Tabel `users` BELUM punya kolom email sama sekali (cek migration
--      1700000000000) - padahal fitur ini WAJIB tau alamat email penerima.
--      Kolom dibuat NULLABLE (bukan NOT NULL) supaya user lama yang belum
--      punya email tidak bikin migration gagal - Admin isi manual belakangan
--      lewat User Management. User tanpa email otomatis di-skip dari daftar
--      penerima (lihat notificationService.js), bukan bikin error.
--   2. `notification_log` - histori pengiriman, dipakai buat 2 hal:
--      (a) cegah spam - cek kapan terakhir kali notifikasi utk part_id yg
--          sama dikirim, dibandingkan sama notif_pm_part_interval_hours
--      (b) audit - siapa aja yang dikirimin, kapan, berhasil/gagal
--   3. Settings baru (category 'notifikasi') - otomatis muncul di halaman
--      Settings (frontend sudah generic per-category, tinggal render).

ALTER TABLE users ADD COLUMN email VARCHAR(150);
CREATE INDEX idx_users_email ON users(email);

COMMENT ON COLUMN users.email IS 'Alamat email buat notifikasi (PM Part Danger, dst). Nullable - user tanpa email otomatis di-skip dari daftar penerima notifikasi, TIDAK memblokir fitur user lain.';

CREATE TABLE notification_log (
    id                  BIGSERIAL PRIMARY KEY,
    notification_type  VARCHAR(30) NOT NULL CHECK (notification_type IN ('PM_PART_DANGER')),
    ref_id              INT NOT NULL,
    recipients          TEXT NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED')),
    error_message       TEXT,
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_log_type_ref ON notification_log(notification_type, ref_id, sent_at DESC);

COMMENT ON TABLE notification_log IS 'Histori pengiriman notifikasi. Dipakai buat cegah spam (cek sent_at terakhir vs jeda di Settings) dan audit siapa penerimanya. notification_type CHECK sengaja extensible - "INVENTORY_ORDER" nanti ditambah setelah rumus ROP (Q2/Q3) fix.';
COMMENT ON COLUMN notification_log.recipients IS 'Daftar email penerima ACTUAL saat pengiriman ini terjadi (pisah koma) - dicatat apa adanya, bukan re-query ke role saat ini, supaya histori tetap akurat walau role/email user berubah belakangan.';
COMMENT ON COLUMN notification_log.ref_id IS 'ID referensi sesuai notification_type. Untuk PM_PART_DANGER -> parts.id.';

INSERT INTO app_settings (key, value, value_type, category, description) VALUES
('notif_pm_part_enabled', 'true', 'boolean', 'notifikasi', 'Aktifkan notifikasi email saat Part berstatus DANGER (perlu diganti/di-order segera)'),
('notif_pm_part_recipient_roles', 'Admin', 'text', 'notifikasi', 'Role penerima email notifikasi PM Part, pisah koma kalau lebih dari 1 (mis. "Admin,Operator")'),
('notif_pm_part_interval_hours', '24', 'number', 'notifikasi', 'Jeda reminder (jam) sebelum email yang sama dikirim ulang untuk Part yang masih DANGER'),
('notif_pm_part_repeat', 'true', 'boolean', 'notifikasi', 'TRUE = kirim reminder berkala selama Part masih berstatus DANGER. FALSE = kirim sekali saja per kejadian DANGER')
ON CONFLICT (key) DO NOTHING;
