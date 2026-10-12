-- 1700000036000_add-pm-today-point-threshold.sql
--
-- Batas poin "PM hari ini" (Monthly & Weekly).
--
-- Masalah: PM hanya boleh dikerjakan di luar jam Line running. Kalau sisa poin
-- Line tinggal 0,5 (mis. shift 1 sudah jalan), maka bila shift berikutnya
-- running poin akan melewati cap. Besok pagi PM tidak selalu bisa dikerjakan
-- (Line bisa saja running), sehingga poin berubah dari +0,5 menjadi minus.
--
-- Solusi: Line dengan 0 <= Sisa Hari <= pm_today_point_threshold ditandai
-- "PM hari ini" (flag perlu_pm_hari_ini) supaya PM dimajukan ke hari ini.
-- Default 0,5 = satu shift. Naikkan (mis. 1,0) kalau mau lebih konservatif,
-- misalnya untuk Line 3 shift. Set 0 untuk menonaktifkan penanda.
--
-- Bersamaan dengan itu, Sisa Hari < 0 (poin sudah melewati cap) sekarang
-- berstatus OVERDUE, bukan lagi DANGER (dihitung di pmLineService, tanpa
-- perubahan skema).

INSERT INTO app_settings (key, value, value_type, category, description) VALUES
('pm_today_point_threshold', '0.5', 'number', 'threshold_monthly_weekly', 'Line dengan Sisa Hari (0 s/d nilai ini) ditandai "PM hari ini" karena PM hanya bisa di luar jam running. 0.5 = satu shift; 0 = nonaktif')
ON CONFLICT (key) DO NOTHING;
