-- 1700000017000_add-soft-delete-recycle-bin.sql
--
-- Recycle Bin (soft-delete + restore) untuk 7 tabel Master Data/relasi yang
-- sebelumnya HARD DELETE: lines, parts, suppliers, inventory_items, roles,
-- part_cl_mapping, part_suppliers. Users TIDAK termasuk (User Management
-- sudah punya mekanisme sendiri: is_active toggle + Admin approval, bukan
-- delete - di luar scope recycle bin ini).
--
-- POLA: kolom deleted_at (NULL = aktif) + deleted_by (siapa yang hapus).
-- deleted_by ON DELETE SET NULL - kalau user yang menghapus itu sendiri
-- kelak dihapus dari sistem, riwayat "siapa yang hapus" bukan hal kritis
-- untuk dipertahankan dengan RESTRICT (beda dengan audit_log.user_id yang
-- sengaja RESTRICT, lihat migration 1700000005000).
--
-- PENTING - UNIQUE CONSTRAINT: semua tabel di atas punya UNIQUE constraint
-- yang sebelumnya UNCONDITIONAL (line_name, supplier_name, spare_part_number,
-- role name, dst). Begitu sebuah row di-soft-delete, row-nya MASIH ADA
-- secara fisik di tabel - jadi constraint lama ini akan TETAP memblokir
-- pembuatan row baru dengan nama yang sama walau yang lama sudah "di-trash".
-- Diubah jadi PARTIAL UNIQUE INDEX (WHERE deleted_at IS NULL), pola yang
-- sama persis dengan uq_part_suppliers_one_primary (migration 1700000014000)
-- - constraint cuma berlaku ke row yang masih aktif, row di Recycle Bin
-- gak dihitung, jadi nama bisa dipakai ulang.

-- ============================================================
-- lines
-- ============================================================
ALTER TABLE lines ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE lines ADD COLUMN deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_lines_deleted_at ON lines(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE lines DROP CONSTRAINT IF EXISTS lines_line_name_key;
CREATE UNIQUE INDEX uq_lines_line_name_active ON lines(line_name) WHERE deleted_at IS NULL;

-- ============================================================
-- parts
-- ============================================================
ALTER TABLE parts ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE parts ADD COLUMN deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_parts_deleted_at ON parts(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE parts DROP CONSTRAINT IF EXISTS uq_parts_line_jig_drawing;
CREATE UNIQUE INDEX uq_parts_line_jig_drawing_active ON parts(line_id, jig_name, drawing_no) WHERE deleted_at IS NULL;

-- ============================================================
-- suppliers
-- ============================================================
ALTER TABLE suppliers ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE suppliers ADD COLUMN deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_suppliers_deleted_at ON suppliers(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS uq_suppliers_name;
CREATE UNIQUE INDEX uq_suppliers_name_active ON suppliers(supplier_name) WHERE deleted_at IS NULL;

-- ============================================================
-- inventory_items
-- ============================================================
ALTER TABLE inventory_items ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE inventory_items ADD COLUMN deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_inventory_items_deleted_at ON inventory_items(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_spare_part_number_key;
CREATE UNIQUE INDEX uq_inventory_items_spn_active ON inventory_items(spare_part_number) WHERE deleted_at IS NULL;

-- ============================================================
-- roles
-- ============================================================
ALTER TABLE roles ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE roles ADD COLUMN deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_roles_deleted_at ON roles(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key;
CREATE UNIQUE INDEX uq_roles_name_active ON roles(name) WHERE deleted_at IS NULL;

-- ============================================================
-- part_cl_mapping
-- ============================================================
ALTER TABLE part_cl_mapping ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE part_cl_mapping ADD COLUMN deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_part_cl_mapping_deleted_at ON part_cl_mapping(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE part_cl_mapping DROP CONSTRAINT IF EXISTS uq_part_cl_mapping;
CREATE UNIQUE INDEX uq_part_cl_mapping_active ON part_cl_mapping(part_id, cl_no) WHERE deleted_at IS NULL;

-- ============================================================
-- part_suppliers
-- ============================================================
ALTER TABLE part_suppliers ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE part_suppliers ADD COLUMN deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_part_suppliers_deleted_at ON part_suppliers(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE part_suppliers DROP CONSTRAINT IF EXISTS uq_part_suppliers;
CREATE UNIQUE INDEX uq_part_suppliers_active ON part_suppliers(part_id, supplier_id) WHERE deleted_at IS NULL;

-- uq_part_suppliers_one_primary lama gak ikut deleted_at - row yang sudah
-- di-trash tapi is_primary=TRUE (nilai lama, gak diubah waktu soft-delete)
-- akan tetap "menghabisi jatah" partial index ini dan blokir Part yang sama
-- set primary baru. Recreate dengan tambahan filter deleted_at IS NULL.
DROP INDEX IF EXISTS uq_part_suppliers_one_primary;
CREATE UNIQUE INDEX uq_part_suppliers_one_primary ON part_suppliers(part_id) WHERE is_primary = TRUE AND deleted_at IS NULL;

-- ============================================================
-- audit_log - tambah 'RESTORE' sebagai action valid (dipakai recycleBinService)
-- ============================================================
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK (action IN ('CREATE','UPDATE','DELETE','RESTORE'));