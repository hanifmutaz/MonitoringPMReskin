-- 1700000019000_add-weekly-point-accrual.sql
--
-- PERUBAHAN FORMULA PM Weekly: dari "murni kalender" (Bagian 2.C lama)
-- menjadi BERBASIS POIN, pola sama persis dengan PM Monthly (Bagian 2.B) -
-- DIMINTA EKSPLISIT lewat chat. Alasan: sebelumnya Sisa Hari Weekly tetap
-- berkurang meski Line MATI TOTAL (tidak running sama sekali) di hari itu -
-- tidak representatif terhadap keausan/kebutuhan PM yang sebenarnya
-- berbasis pemakaian, bukan kalender semata.
--
-- Formula baru (analog Monthly, lihat pmMonthlyAccrualService.js):
--   running >= pm_weekly_min_run_count_full (default 2) -> +pm_weekly_point_full_run
--   running == 1                                         -> +pm_weekly_point_half_run
--   running == 0 (Line tidak jalan)                       -> +0 (TIDAK ADA pengurangan sisa hari)
--   akumulasi di-cap ke pm_weekly_total_days (dipakai ulang sebagai "target
--   poin sebelum due", sama seperti pm_monthly_point_cap untuk Monthly -
--   key/nama setting TIDAK diganti supaya threshold_monthly_weekly yang
--   sudah ada tetap konsisten dipakai).
--
-- akumulasi_poin_weekly (BARU) menggantikan peran "Total Hari Weekly"
-- (dateUtils.daysSince) di pmLineService.computeLineStatus() - lihat
-- perubahan kode terkait di commit yang sama dengan migration ini.

ALTER TABLE pm_monthly_helper
    ADD COLUMN akumulasi_poin_weekly NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (akumulasi_poin_weekly >= 0);

COMMENT ON COLUMN pm_monthly_helper.akumulasi_poin_weekly IS 'Akumulasi poin PM Weekly (pola sama dengan akumulasi_poin_monthly) - di-cap sesuai pm_weekly_total_days. Line yang tidak running di suatu hari TIDAK menambah poin (bukan pengurangan sisa hari kalender lagi sejak migration 1700000019000).';

INSERT INTO app_settings (key, value, value_type, category, description) VALUES
    ('pm_weekly_point_full_run',      '1',   'number', 'skema_poin_weekly', 'Poin jika line running >=2x/hari'),
    ('pm_weekly_point_half_run',      '0.5', 'number', 'skema_poin_weekly', 'Poin jika line running 1x/hari'),
    ('pm_weekly_min_run_count_full',  '2',   'number', 'skema_poin_weekly', 'Ambang running/hari untuk dianggap full point');

COMMENT ON COLUMN pm_monthly_helper.tgl_pm_weekly_terakhir IS 'Baseline mulai hitung akumulasi_poin_weekly (hari setelah tanggal ini yang dihitung) - sama pola dengan tgl_pm_monthly_terakhir.';

-- pm_weekly_total_days key TIDAK diganti (dipakai ulang sebagai cap poin),
-- cuma deskripsinya diupdate biar gak menyesatkan pembaca app_settings.
UPDATE app_settings
SET description = 'Target akumulasi poin PM Weekly sebelum due (cap) - dipakai ulang dari "siklus hari" lama, sekarang basis poin bukan kalender murni'
WHERE key = 'pm_weekly_total_days';