-- 1700000035000_add-baseline-shift-cut.sql
--
-- Akrual poin sadar-shift di TANGGAL PM. Saat PM disubmit, simpan berapa shift di
-- tanggal itu yang sudah mulai pada jam PM (cut). Akrual lalu ikut menghitung shift
-- bernomor > cut di tanggal baseline (mis. PM 20:00 -> Shift 2 malam itu masuk poin).
-- NULL = tidak diketahui (edit tanggal manual oleh Admin / PM pertama backdate):
-- seluruh tanggal baseline dibuang dari akrual, perilaku lama.
ALTER TABLE pm_monthly_helper
  ADD COLUMN pm_monthly_baseline_shift_cut SMALLINT,
  ADD COLUMN pm_weekly_baseline_shift_cut SMALLINT;
