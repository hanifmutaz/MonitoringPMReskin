-- 1700000030000_add-backup-auto-settings.sql
--
-- Backup database otomatis terjadwal (Settings > Umum > Backup Otomatis).
-- Job-nya: src/jobs/backupJob.js. File disimpan di folder BACKUP_DIR (env)
-- di server, bukan di database ini. Default NONAKTIF supaya deployment lama
-- tidak tiba-tiba mulai menulis file ke disk setelah upgrade.
--
-- Nilai text divalidasi per-key di settingsValidator.js (format jam HH:MM WIB,
-- format file dump|sql|xlsx), bukan di constraint DB, sama dengan setting lain.

INSERT INTO app_settings (key, value, value_type, category, description) VALUES
('backup_auto_enabled',       'false', 'boolean', 'backup_otomatis', 'Aktifkan backup database otomatis sesuai jadwal'),
('backup_auto_time',          '02:00', 'text',    'backup_otomatis', 'Jam backup otomatis dijalankan (format HH:MM, zona WIB)'),
('backup_auto_interval_days', '1',     'number',  'backup_otomatis', 'Jarak antar backup otomatis dalam hari (1 = tiap hari, 7 = tiap minggu)'),
('backup_auto_format',        'dump',  'text',    'backup_otomatis', 'Format file backup otomatis: dump (disarankan), sql, atau xlsx'),
('backup_auto_keep',          '7',     'number',  'backup_otomatis', 'Jumlah file backup terbaru yang disimpan di server (yang lebih lama dihapus otomatis)')
ON CONFLICT (key) DO NOTHING;
