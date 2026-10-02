-- 1700000029000_add-display-role.sql
--
-- Role "Display" untuk akun monitor/TV (dashboard Management & area teknisi).
-- Sengaja TANPA permission apa pun di role_permissions: dashboard terbuka untuk
-- semua role yang login, sedangkan semua menu lain (PM Part, PM Monthly/Weekly,
-- Master Data, Inventory, Audit Log) butuh permission eksplisit, jadi akun
-- Display otomatis view-only. Admin tetap bisa menambah permission dari UI
-- Role Management kalau suatu saat perlu.
--
-- Sesi login role ini lebih panjang (lihat JWT_EXPIRES_IN_DISPLAY di env.js)
-- supaya monitor tidak logout tiap 8 jam. Akun dibuat Admin lewat User
-- Management (bukan di migration, supaya tidak ada password di repo).
INSERT INTO roles (name, is_system)
SELECT 'Display', FALSE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Display' AND deleted_at IS NULL);
