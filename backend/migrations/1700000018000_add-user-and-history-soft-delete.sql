-- 1700000018000_add-user-and-history-soft-delete.sql
--
-- Perluasan Recycle Bin (migration 1700000017000) ke 4 tabel yang tadinya
-- SENGAJA dikecualikan: users, pm_monthly_history (History PM Monthly and
-- Weekly), pm_part_history (History PM Part), inventory_stock_movements
-- (History Inventory). Diminta eksplisit lewat chat - kebutuhan Admin buat
-- ngebersihin data hasil PENGETESAN SISTEM tanpa harus reset seluruh
-- database. Pola sama persis dengan migration 1700000017000: kolom
-- deleted_at (NULL = aktif) + deleted_by (ON DELETE SET NULL - siapa yang
-- hapus bukan hal kritis buat dipertahankan dengan RESTRICT).
--
-- CATATAN users: sebelumnya di migration 1700000017000 users SENGAJA
-- dikecualikan karena "User Management sudah punya mekanisme sendiri
-- (is_active toggle + approval)". Keputusan itu diubah di sini ATAS
-- PERMINTAAN EKSPLISIT - Admin butuh cara buang akun-akun hasil testing
-- (lihat contoh test_auth_* di UI). is_active/approval TETAP ada & TIDAK
-- berubah - soft-delete ini kanal terpisah, dipakai kalau akun itu memang
-- mau dibuang sepenuhnya (bukan sekadar dinonaktifkan sementara).
--
-- CATATAN referensial: pm_monthly_history/pm_part_history dipakai LIVE buat
-- ngitung status PM (full-recompute per ADR 006 - lihat COUNTER_CTE di
-- pmPartQueries.js dan query ketepatan di pm*HistoryQueries.js) - SEMUA
-- query yang baca tabel ini di source code ikut ditambahin filter
-- `deleted_at IS NULL` di commit yang sama dengan migration ini, supaya
-- row yang di-soft-delete beneran hilang dari perhitungan, bukan cuma dari
-- tampilan list.

-- ============================================================
-- users
-- ============================================================
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- username UNIQUE lama unconditional - begitu di-soft-delete row-nya masih
-- ada fisik, jadi diganti partial unique index (pola sama dengan
-- 1700000017000) supaya username bisa dipakai ulang begitu yang lama
-- di-trash.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
CREATE UNIQUE INDEX uq_users_username_active ON users(username) WHERE deleted_at IS NULL;

-- ============================================================
-- pm_monthly_history (History PM Monthly and Weekly)
-- ============================================================
ALTER TABLE pm_monthly_history ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE pm_monthly_history ADD COLUMN deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_pm_monthly_history_deleted_at ON pm_monthly_history(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================
-- pm_part_history (History PM Part)
-- ============================================================
ALTER TABLE pm_part_history ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE pm_part_history ADD COLUMN deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_pm_part_history_deleted_at ON pm_part_history(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================
-- inventory_stock_movements (History Inventory)
-- ============================================================
ALTER TABLE inventory_stock_movements ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE inventory_stock_movements ADD COLUMN deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_inventory_stock_movements_deleted_at ON inventory_stock_movements(deleted_at) WHERE deleted_at IS NOT NULL;
