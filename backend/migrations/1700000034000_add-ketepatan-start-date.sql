-- 1700000034000_add-ketepatan-start-date.sql
--
-- "Mulai hitung ketepatan dari tanggal": masa transisi saat sistem baru dipakai.
-- Event PM (Part, Monthly, Weekly) SEBELUM tanggal ini tetap tersimpan utuh di
-- history, tapi TIDAK ikut dihitung di persentase ketepatan (dashboard, per Line,
-- tren). Kosong = nonaktif (semua event periode berjalan dihitung, perilaku lama).
-- Format YYYY-MM-DD (WIB). Bisa diubah kapan saja tanpa kehilangan data.

INSERT INTO app_settings (key, value, value_type, category, description) VALUES
('ketepatan_start_date', '', 'text', 'skema_poin_monthly', 'Mulai hitung Ketepatan PM dari tanggal ini (YYYY-MM-DD). Event sebelum tanggal ini tidak ikut dihitung. Kosong = nonaktif')
ON CONFLICT (key) DO NOTHING;
