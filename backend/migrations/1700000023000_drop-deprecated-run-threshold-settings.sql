-- 1700000023000_drop-deprecated-run-threshold-settings.sql
--
-- Lanjutan migration 1700000022000 (formula poin proporsional per
-- jumlah_shift). Setting-setting di bawah ini adalah threshold binary
-- full/half GLOBAL dari formula LAMA yang sudah tidak dibaca sama sekali
-- oleh pmMonthlyAccrualService.js / pmWeeklyAccrualService.js:
--
--   pm_monthly_min_run_count_full, pm_monthly_point_half_run
--   pm_weekly_min_run_count_full,  pm_weekly_point_half_run
--
-- Dihapus sekarang (bukan cuma dibiarkan nganggur) supaya Settings page
-- tidak menampilkan kontrol yang keliatan bisa diubah tapi sebenarnya
-- tidak ngefek ke behavior apapun - berpotensi menyesatkan user.
--
-- pm_monthly_point_full_run & pm_weekly_point_full_run TETAP DIPAKAI
-- (jadi pengali formula proporsional) - TIDAK dihapus.

DELETE FROM app_settings
WHERE key IN (
    'pm_monthly_min_run_count_full',
    'pm_monthly_point_half_run',
    'pm_weekly_min_run_count_full',
    'pm_weekly_point_half_run'
);
