-- 1700000028000_granular-permissions.sql
--
-- Permission dibuat granular supaya akses bisa diatur penuh dari halaman
-- User & Role, tanpa hardcode nama role di kode:
--
--   1. Inventory dipecah: 'inventory.input' (tambah item + catat stok, TANPA
--      edit/hapus) dan 'inventory.manage' (edit + hapus; sudah termasuk input).
--   2. Master Data: 'masterdata.edit' (tambah/ubah) dan 'masterdata.delete'
--      (hapus). Menggantikan cek nama role 'Operator' + toggle global
--      allow_operator_edit_master_data (yang bikin role buatan sendiri, mis.
--      "Supervisor", tidak pernah bisa dikasih hak edit).
--   3. Permission "lihat" per modul: 'pm_part.view', 'pm_line.view',
--      'masterdata.view', 'inventory.view', 'auditlog.view'. Sebelumnya semua
--      endpoint GET terbuka untuk siapa pun yang login, jadi menu tidak bisa
--      disembunyikan per role. Dashboard TETAP terbuka untuk semua role login.
--
-- Perilaku yang sudah ada TIDAK berubah diam-diam (seed di bawah):
--   - role yang punya 'inventory.manage' otomatis dapat 'inventory.input'
--   - Operator dapat 'masterdata.edit' HANYA kalau toggle lama sedang 'true'
--   - semua role non-Admin dapat permission lihat modul yang dulu terbuka
--     (pm_part/pm_line/masterdata/inventory). 'auditlog.view' TIDAK di-seed
--     karena Audit Log dulu Admin-only.
-- Admin tetap superuser ('*'), tidak butuh row role_permissions.

INSERT INTO permissions (key, label, description) VALUES
('inventory.input',  'Input Inventory',          'Tambah item Inventory baru dan catat stok masuk/keluar (tanpa edit dan hapus)'),
('masterdata.edit',  'Ubah Master Data',         'Tambah/ubah Line, Part, Supplier, CL Mapping, relasi Part-Supplier, link Inventory, dan Import Excel'),
('masterdata.delete','Hapus Master Data',        'Hapus Line, Part, dan Supplier'),
('pm_part.view',     'Lihat PM Part',            'Menu Monitoring PM Part dan History PM Part. Tombol input butuh ini + Submit Penggantian PM Part'),
('pm_line.view',     'Lihat PM Monthly/Weekly',  'Menu Monitoring dan History PM Monthly & Weekly. Tombol input butuh ini + Submit PM Monthly/Weekly'),
('masterdata.view',  'Lihat Master Data',        'Menu Master Data (Line, Part, Supplier, Import Excel)'),
('inventory.view',   'Lihat Inventory',          'Menu Inventory dan History Inventory'),
('auditlog.view',    'Lihat Audit Log',          'Menu Audit Log (hanya lihat)')
ON CONFLICT (key) DO NOTHING;

UPDATE permissions
SET label = 'Kelola Inventory (Edit dan Hapus)',
    description = 'Edit item Inventory, hapus item, atur Lead Time. Sudah termasuk hak input, jadi tidak perlu dicentang bareng Input Inventory'
WHERE key = 'inventory.manage';

-- 1. inventory.manage -> juga dapat inventory.input
INSERT INTO role_permissions (role_id, permission_key)
SELECT rp.role_id, 'inventory.input'
FROM role_permissions rp
WHERE rp.permission_key = 'inventory.manage'
ON CONFLICT DO NOTHING;

-- 2. Toggle lama allow_operator_edit_master_data = 'true' -> Operator dapat masterdata.edit
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'masterdata.edit'
FROM roles r
WHERE r.name = 'Operator'
  AND r.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM app_settings s
    WHERE s.key = 'allow_operator_edit_master_data' AND s.value = 'true'
  )
ON CONFLICT DO NOTHING;

-- 3. Permission lihat: semua role non-Admin yang sudah ada tetap bisa lihat
--    modul yang dulu terbuka. Admin yang mau mempersempit (mis. Management
--    cuma Dashboard) cukup uncheck di halaman User & Role.
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
CROSS JOIN (VALUES ('pm_part.view'), ('pm_line.view'), ('masterdata.view'), ('inventory.view')) AS p(key)
WHERE r.name <> 'Admin' AND r.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Toggle global sudah digantikan permission 'masterdata.edit' - dihapus
-- supaya tidak ada 2 mekanisme tumpang tindih (grant di setting_role_access
-- ikut terhapus lewat ON DELETE CASCADE).
DELETE FROM app_settings WHERE key = 'allow_operator_edit_master_data';

-- Operator bukan role sistem lagi: tidak ada kode yang hardcode nama itu,
-- jadi boleh di-rename/dihapus dari halaman User & Role. Hanya 'Admin' yang
-- dilindungi (superuser bypass by name).
UPDATE roles SET is_system = FALSE WHERE name = 'Operator';
COMMENT ON COLUMN roles.is_system IS 'TRUE hanya untuk role Admin (superuser bypass by name) - dilindungi dari rename/delete. Role lain (termasuk Operator bawaan) bebas diedit/dihapus.';
