-- 1700000039000_add-cleaning-color-thresholds.sql
--
-- Batas warna panel "Cleaning Line Tidak Running" (Mode TV). Sisa hari cleaning:
--   <= idle_cleaning_danger_days  -> merah
--   <= idle_cleaning_warn_days    -> kuning
--   selain itu                    -> normal
-- Murni tampilan (tidak mengubah kapan cleaning dianggap wajib/jatuh tempo).

INSERT INTO app_settings (key, value, value_type, category, description) VALUES
('idle_cleaning_warn_days', '14', 'number', 'line_tidak_running', 'Panel Cleaning Line Tidak Running tampil KUNING jika sisa hari cleaning <= nilai ini'),
('idle_cleaning_danger_days', '7', 'number', 'line_tidak_running', 'Panel Cleaning Line Tidak Running tampil MERAH jika sisa hari cleaning <= nilai ini')
ON CONFLICT (key) DO NOTHING;
