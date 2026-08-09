-- 1700000015000_add-pm-history-pic.sql
--
-- Kolom PIC (Person In Charge) - nama operator/teknisi yang BENERAN
-- ngerjain PM di lapangan. Ini SENGAJA dipisah dari user_id (akun yang
-- login/submit form) karena di shop-floor kadang 1 akun dipakai bareng
-- di 1 terminal/tablet oleh beberapa orang bergantian, jadi user_id doang
-- gak cukup buat nunjukin siapa yang eksekusi PM-nya secara fisik.
--
-- Nullable (bukan NOT NULL) di level DB - sama filosofi dengan kolom
-- on_time (migration 1700000012000): baris LAMA sebelum kolom ini ada
-- gak mungkin di-backfill retroaktif, jadi dibiarkan NULL alih-alih
-- dipaksa isi nilai palsu. WAJIB diisi untuk input BARU - itu ditegakkan
-- di validator (pmPartHistoryValidator.js / pmLineHistoryValidator.js),
-- bukan di constraint DB.

ALTER TABLE pm_part_history ADD COLUMN pic_name VARCHAR(150);
COMMENT ON COLUMN pm_part_history.pic_name IS 'Nama PIC yang benar-benar mengerjakan penggantian part di lapangan (bisa beda dari user_id/akun yang submit). Wajib diisi untuk input baru, NULL untuk data lama.';

ALTER TABLE pm_monthly_history ADD COLUMN pic_name VARCHAR(150);
COMMENT ON COLUMN pm_monthly_history.pic_name IS 'Nama PIC yang benar-benar mengerjakan PM Monthly/Weekly di lapangan. Sama filosofi dengan pm_part_history.pic_name.';