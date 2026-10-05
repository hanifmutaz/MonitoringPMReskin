-- 1700000031000_add-raw-uncapped-points.sql
--
-- Fix: PM yang dilakukan tepat di hari jatuh tempo ikut dihitung "telat".
--
-- Penyebab: akumulasi_poin_monthly/weekly di-cap (30 / 7). Begitu poin = cap
-- (sisa hari 0 = jatuh tempo HARI INI), determineOnTime() memakai `poin < cap`
-- sehingga PM di hari jatuh tempo dianggap telat. Karena sudah di-cap, sistem
-- juga tidak bisa membedakan "jatuh tempo hari ini" dengan "sudah lewat 5 hari".
--
-- Solusi: simpan juga poin MENTAH (tanpa cap) di kolom *_raw. Dipakai KHUSUS
-- untuk menilai ketepatan: telat hanya jika poin mentah > cap (benar-benar
-- sudah lewat jatuh tempo). Kolom akumulasi_poin_* (ter-cap) tetap dipakai
-- untuk Sisa Hari & Status, tidak berubah.
--
-- Nullable: baris lama baru terisi setelah job accrual berikutnya jalan.
-- Selama NULL, determineOnTime() memakai aturan lama sebagai fallback.

ALTER TABLE pm_monthly_helper
  ADD COLUMN akumulasi_poin_monthly_raw NUMERIC(8,1) CHECK (akumulasi_poin_monthly_raw IS NULL OR akumulasi_poin_monthly_raw >= 0),
  ADD COLUMN akumulasi_poin_weekly_raw  NUMERIC(8,1) CHECK (akumulasi_poin_weekly_raw  IS NULL OR akumulasi_poin_weekly_raw  >= 0);

COMMENT ON COLUMN pm_monthly_helper.akumulasi_poin_monthly_raw IS 'Poin Monthly SEBELUM di-cap. Hanya untuk penilaian ketepatan (on_time); Sisa Hari/Status tetap pakai akumulasi_poin_monthly (ter-cap).';
COMMENT ON COLUMN pm_monthly_helper.akumulasi_poin_weekly_raw  IS 'Poin Weekly SEBELUM di-cap. Hanya untuk penilaian ketepatan (on_time); Sisa Hari/Status tetap pakai akumulasi_poin_weekly (ter-cap).';
