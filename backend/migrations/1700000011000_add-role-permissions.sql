-- 1700000011000_add-role-permissions.sql
--
-- Role bisa dibuat dari APLIKASI (bukan cuma 2 role hardcode Admin/Operator
-- dari migration awal), dan role baru itu perlu akses granular per
-- fitur/halaman (dikonfirmasi user), bukan sekadar label buat notifikasi.
--
-- DESAIN:
--   - `roles.is_system` menandai Admin & Operator sebagai role bawaan yang
--     TIDAK BOLEH dihapus/di-rename - karena beberapa bagian kode masih
--     hardcode cek by NAME (Admin = superuser bypass semua permission check,
--     lihat requirePermission() middleware). Role baru buatan Admin lewat
--     app selalu is_system = FALSE, bebas diedit/dihapus (asal tidak ada
--     user yang masih pakai role itu).
--   - `permissions` - katalog FIXED capability yang ada di aplikasi.
--     Menambah permission BARU = lewat migration (nempel ke fitur baru di
--     kode), tapi ASSIGN permission ke role BISA dari UI - itu yang
--     dikonfirmasi user ("perlu akses/permission halaman tertentu").
--   - `role_permissions` - many-to-many role <-> permission.
--   - Role "Admin" TIDAK butuh row di role_permissions - middleware
--     requirePermission() selalu bypass total untuk role name = 'Admin'
--     (superuser), row untuk Admin di tabel ini sifatnya opsional/informatif.
--   - Operator di-seed permission PERSIS SAMA dengan behavior SEBELUM
--     migration ini (pm_part.submit, pm_line.submit, inventory.manage) -
--     supaya user existing TIDAK mendadak kehilangan akses apa pun.
--   - Master Data TETAP pakai mekanisme lama (allow_operator_edit_master_data
--     di app_settings, lihat masterDataAccess.js) - TIDAK dipindah ke sistem
--     permission baru ini, supaya tidak ada 2 mekanisme tumpang tindih untuk
--     fitur yang sama. Begitu juga Settings & User Management tetap Admin-only
--     hardcode (terlalu sensitif untuk dibuka granular di tahap ini).

ALTER TABLE roles ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE roles SET is_system = TRUE WHERE name IN ('Admin', 'Operator');

COMMENT ON COLUMN roles.is_system IS 'TRUE untuk role bawaan (Admin, Operator) - dilindungi dari rename/delete karena sebagian kode hardcode cek by name. Role baru buatan Admin selalu FALSE.';

CREATE TABLE permissions (
    key             VARCHAR(60) PRIMARY KEY,
    label           VARCHAR(150) NOT NULL,
    description     TEXT
);

COMMENT ON TABLE permissions IS 'Katalog fixed permission/capability. Menambah permission baru butuh migration (nempel ke kode fitur), TAPI assign ke role bisa dari UI Role Management.';

CREATE TABLE role_permissions (
    role_id         INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_key  VARCHAR(60) NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_key)
);

COMMENT ON TABLE role_permissions IS 'Assignment permission ke role. Role Admin TIDAK wajib punya row di sini - middleware requirePermission() selalu bypass total untuk role name = Admin (superuser).';

INSERT INTO permissions (key, label, description) VALUES
('pm_part.submit', 'Submit Penggantian PM Part', 'Input riwayat penggantian part, termasuk lewat scan barcode Drawing No'),
('pm_line.submit', 'Submit PM Monthly/Weekly', 'Input riwayat PM Monthly & Weekly per Line'),
('inventory.manage', 'Kelola Inventory', 'CRUD Inventory Item, catat mutasi stok masuk/keluar, atur Lead Time')
ON CONFLICT (key) DO NOTHING;

-- Seed permission default Operator = PERSIS sama behavior sebelum migration
-- ini (dulu hardcode requireRole('Admin','Operator') di 3 fitur ini)
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
CROSS JOIN (VALUES ('pm_part.submit'), ('pm_line.submit'), ('inventory.manage')) AS p(key)
WHERE r.name = 'Operator'
ON CONFLICT DO NOTHING;
