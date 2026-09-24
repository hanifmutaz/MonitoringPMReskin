-- 1700000022000_add-line-jumlah-shift.sql
--
-- FIX: PM Monthly/Weekly point accrual (pmMonthlyAccrualService.js /
-- pmWeeklyAccrualService.js) sebelumnya pakai threshold GLOBAL
-- (pm_monthly_min_run_count_full, default 2) buat nentuin "full point".
-- Akibatnya Line 3-shift yang jalan penuh (running=3) dapet poin yang
-- SAMA PERSIS dengan Line 2-shift yang jalan penuh (running=2) - keausan
-- Line 3-shift jadi under-counted relatif ke pemakaian real-nya.
--
-- FIX: formula diubah jadi PROPORSIONAL per jumlah shift Line itu sendiri:
--   poin_hari_itu = MIN(running / jumlah_shift, 1) * point_full_run
--
-- Butuh tau "jumlah_shift" per Line (2 atau 3) - kolom baru ini itu
-- jawabannya. Default 2 (mayoritas Line existing jalan 2 shift).

ALTER TABLE lines
    ADD COLUMN jumlah_shift SMALLINT NOT NULL DEFAULT 2 CHECK (jumlah_shift IN (2, 3));

COMMENT ON COLUMN lines.jumlah_shift IS 'Jumlah shift/hari Line ini beroperasi normal (2 atau 3) - dipakai sebagai pembagi formula poin proporsional di pmMonthlyAccrualService.js dan pmWeeklyAccrualService.js, bukan lagi threshold binary full/half global.';
