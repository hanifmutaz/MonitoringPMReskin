-- 1700000004000_audit-log-enhancements.sql
--
-- Dua perbaikan sekaligus dari SECURITY_REVIEW.md, keduanya menyentuh
-- audit_log jadi digabung satu migration:
--
-- (A) Finding #5 — audit log User Management belum granular.
--     Ditambah kolom `action_detail` (nullable, TEXT) untuk ringkasan
--     human-readable, mis. "Role diubah: Operator -> Supervisor",
--     "Password direset", "User dinonaktifkan". `action` (CREATE/UPDATE/
--     DELETE) TIDAK diubah/diperluas — kolom itu dipakai bersama oleh
--     semua tabel (Master Data, Settings, PM History), mengubah CHECK
--     constraint-nya berisiko ke pemanggil recordAudit() lain yang sudah
--     ada. action_detail murni tambahan opsional, aman untuk semua caller
--     lama (NULL kalau tidak diisi).
--
-- (B) Finding #3 — audit log & login_audit_log belum append-only secara
--     teknis. Enforcement dipilih lewat TRIGGER, bukan REVOKE privilege,
--     karena REVOKE tidak efektif terhadap role yang menjadi OWNER tabel
--     (owner tetap punya semua privilege di Postgres terlepas dari GRANT/
--     REVOKE) — dan role aplikasi kemungkinan besar adalah owner tabel ini
--     (dia yang menjalankan migration/CREATE TABLE). Trigger berlaku untuk
--     SIAPA PUN yang connect, termasuk owner, sehingga benar-benar menutup
--     celah "kredensial DB dikompromikan lalu mengubah/menghapus audit
--     trail" yang didokumentasikan sebagai Known Limitation di
--     SECURITY_REVIEW.md.

ALTER TABLE audit_log ADD COLUMN action_detail TEXT;

CREATE OR REPLACE FUNCTION prevent_append_only_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % operation is not permitted (row id=%)',
    TG_TABLE_NAME, TG_OP, COALESCE(OLD.id, NULL);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_log_modification();

CREATE TRIGGER trg_login_audit_log_append_only
  BEFORE UPDATE OR DELETE ON login_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_log_modification();

COMMENT ON COLUMN audit_log.action_detail IS 'Ringkasan human-readable opsional, mis. "Role diubah: Operator -> Supervisor". NULL untuk entry lama/aksi yang tidak butuh detail tambahan.';