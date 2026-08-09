-- 1700000013000_add-multi-site-dashboard-permission.sql
--
-- Permission baru buat GET /dashboard/multi-site (endpoint yang narik data
-- Subcont dari instance Internal - lihat multiSiteService.js). Sengaja
-- dibuat sebagai permission granular (bukan hardcode Admin-only kayak
-- Settings/User Management) karena ini fitur observability biasa, bukan
-- sesuatu yang mengubah data sensitif - manager/supervisor non-Admin wajar
-- kalau dikasih akses lihat cross-site.
--
-- TIDAK di-seed ke role manapun secara default (termasuk Operator) - Admin
-- yang assign manual lewat UI Role Management ke role yang emang butuh liat
-- dashboard gabungan 3 lokasi. Admin sendiri selalu bypass otomatis lewat
-- middleware requirePermission() (lihat migration 011), gak perlu row di
-- role_permissions.

INSERT INTO permissions (key, label, description) VALUES
('dashboard.multi_site', 'Lihat Dashboard Multi-Lokasi', 'Akses ringkasan gabungan Internal + Subcont (SGP & Systech) di satu layar')
ON CONFLICT (key) DO NOTHING;
