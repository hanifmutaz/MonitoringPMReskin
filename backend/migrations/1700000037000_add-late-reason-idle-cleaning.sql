-- 1700000037000_add-late-reason-idle-cleaning.sql
--
-- Tiga hal yang saling terkait:
--
-- 1) Alasan keterlambatan PM (alasan_telat) di pm_part_history & pm_monthly_history.
--    Diisi operator HANYA saat PM yang disubmit dinilai telat (on_time = FALSE).
--    Nullable di DB (baris lama dan PM tepat waktu tidak punya alasan); wajibnya
--    ditegakkan di service saat on_time = FALSE (tepat setelah ketepatan dihitung).
--
-- 2) Line TIDAK RUNNING. "Tidak running" = Line aktif tanpa output sama sekali
--    (production_cache.output_actual > 0) selama >= idle_min_days hari sampai
--    hari ini. Dihitung live dari production_cache, tidak ada tabel cache baru.
--
-- 3) Cleaning Line tidak running. Line yang tidak running wajib dibersihkan
--    tiap idle_cleaning_interval_days hari. Hitungan dimulai dari cleaning
--    TERAKHIR (line_cleaning_history); kalau belum pernah di-cleaning, dari
--    hari pertama Line berhenti running. Nilai minimum hari & interval bisa
--    diubah di Settings (kategori 'line_tidak_running').

ALTER TABLE pm_part_history ADD COLUMN alasan_telat TEXT;
COMMENT ON COLUMN pm_part_history.alasan_telat IS
  'Alasan keterlambatan PM Part. Wajib diisi saat on_time = FALSE; NULL untuk PM tepat waktu, jenis yang dikecualikan, dan data lama.';

ALTER TABLE pm_monthly_history ADD COLUMN alasan_telat TEXT;
COMMENT ON COLUMN pm_monthly_history.alasan_telat IS
  'Alasan keterlambatan PM Monthly/Weekly. Wajib diisi saat on_time = FALSE; NULL untuk PM tepat waktu dan data lama.';

CREATE TABLE line_cleaning_history (
    id            SERIAL PRIMARY KEY,
    line_id       INT NOT NULL REFERENCES lines(id) ON DELETE RESTRICT,
    tgl_cleaning  DATE NOT NULL,
    pic_name      VARCHAR(150) NOT NULL,
    keterangan    TEXT,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_line_cleaning_history_line_tgl ON line_cleaning_history(line_id, tgl_cleaning DESC);

COMMENT ON TABLE line_cleaning_history IS
  'Riwayat cleaning Line yang tidak running. MAX(tgl_cleaning) per Line jadi basis hitungan interval cleaning berikutnya.';

INSERT INTO app_settings (key, value, value_type, category, description) VALUES
('idle_monitoring_enabled', 'true', 'boolean', 'line_tidak_running', 'Aktifkan deteksi Line tidak running. Nonaktif = panel Line Tidak Running kosong dan semua Line tetap masuk Jadwal PM 7 Hari ke Depan'),
('idle_min_days', '7', 'number', 'line_tidak_running', 'Line dianggap tidak running jika tidak ada output selama minimal sekian hari berturut-turut sampai hari ini. Line ini tidak ditampilkan di Jadwal PM 7 Hari ke Depan'),
('idle_cleaning_interval_days', '60', 'number', 'line_tidak_running', 'Line tidak running wajib di-cleaning setiap sekian hari, dihitung dari cleaning terakhir (atau dari hari pertama tidak running jika belum pernah)')
ON CONFLICT (key) DO NOTHING;
