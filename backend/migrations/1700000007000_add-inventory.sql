-- 1700000007000_add-inventory.sql
--
-- Struktur DASAR Inventory (stock per Inventory Item + histori mutasi).
-- SENGAJA BELUM termasuk ROP, Safety Stock, Lead Time, atau Status
-- OK/ORDER (Q2 & Q3 masih HOLD - rumus ROP & Safety Stock belum fix).
-- Itu nyusul di migration terpisah setelah rumusnya disepakati.
--
-- LATAR BELAKANG:
-- Kolom spare_part_number/qty/location/note di tabel `parts` (migration
-- 1700000000000) itu cuma referensi manual - Admin edit manual, TIDAK ada
-- histori mutasi stok (kapan keluar, kapan masuk, berapa, siapa). Sekarang
-- kita bangun Inventory yang beneran live-tracked: current_stock berjalan
-- + histori mutasi lengkap.
--
-- DESAIN PENTING (dikonfirmasi user): 1 jenis spare part fisik BISA dipakai
-- di lebih dari 1 Part row (mis. Cutter Punch yang sama dipakai di Jig A
-- maupun Jig C - 2 row berbeda di `parts`, tapi ambil dari 1 stok fisik yang
-- sama di gudang). Makanya relasi Part -> Inventory Item itu MANY-TO-ONE
-- (banyak Part row bisa nunjuk ke 1 Inventory Item yang sama), BUKAN 1-ke-1.
--
-- Kolom lama spare_part_number/qty/location/note di `parts` TIDAK dihapus
-- (non-destruktif, data lama & Excel import sebelumnya tetap aman), tapi
-- perannya digantikan Inventory Item ke depannya - dianggap deprecated.

CREATE TABLE inventory_items (
    id                  SERIAL PRIMARY KEY,
    spare_part_number   VARCHAR(100) NOT NULL UNIQUE,
    part_name           VARCHAR(150) NOT NULL,
    location            VARCHAR(150),
    note                TEXT,
    current_stock       INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_items_spare_part_number ON inventory_items(spare_part_number);

COMMENT ON TABLE inventory_items IS 'Stock-keeping unit spare part fisik di gudang. 1 Inventory Item bisa dipakai (di-link) oleh banyak Part row di tabel parts (many-to-one) - karena 1 jenis spare part fisik bisa dipasang di beberapa Jig/Line berbeda.';
COMMENT ON COLUMN inventory_items.current_stock IS 'Stok berjalan saat ini - didenormalisasi dari histori inventory_stock_movements, diupdate di service layer dalam 1 transaksi bersama insert movement (bukan trigger DB, supaya gampang di-audit/debug di level aplikasi).';

CREATE TABLE inventory_stock_movements (
    id                  BIGSERIAL PRIMARY KEY,
    inventory_item_id   INT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    movement_type       VARCHAR(20) NOT NULL CHECK (movement_type IN ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT')),
    qty                 INT NOT NULL CHECK (qty > 0),
    note                TEXT,
    ref_type            VARCHAR(30), -- NULL = manual input Admin. Disiapkan buat integrasi scan/pergantian part di masa depan (mis. 'PM_PART_HISTORY')
    ref_id              INT,
    user_id             INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_stock_movements_item ON inventory_stock_movements(inventory_item_id, created_at DESC);

COMMENT ON TABLE inventory_stock_movements IS 'Histori mutasi stok. qty selalu bernilai positif, arah tambah/kurang ditentukan oleh movement_type (STOCK_IN/ADJUSTMENT menambah, STOCK_OUT mengurangi).';
COMMENT ON COLUMN inventory_stock_movements.ref_type IS 'Sumber mutasi: NULL (manual Admin), atau nanti "PM_PART_HISTORY" kalau mutasi terjadi otomatis dari scan penggantian part (fitur scan - masih tahap desain terpisah).';

ALTER TABLE parts
    ADD COLUMN inventory_item_id INT REFERENCES inventory_items(id) ON DELETE SET NULL;

CREATE INDEX idx_parts_inventory_item_id ON parts(inventory_item_id);

COMMENT ON COLUMN parts.inventory_item_id IS 'Link opsional ke Inventory Item (stok spare part fisik). Nullable & many-to-one: beberapa Part row bisa nunjuk ke Inventory Item yang sama kalau spare part fisiknya identik. Kolom spare_part_number/qty/location/note yang lama TETAP ADA (non-destruktif) tapi dianggap deprecated setelah fitur ini.';
