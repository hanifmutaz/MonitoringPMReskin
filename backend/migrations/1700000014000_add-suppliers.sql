-- 1700000014000_add-suppliers.sql
--
-- Master data Supplier + relasi many-to-many ke Part (1 part bisa dipesen
-- dari beberapa supplier - lihat diskusi kebutuhan "daftar supplier per
-- part biar tau pesen kemana"). Pola tabelnya niru part_cl_mapping
-- (migration 1700000000000) yang emang udah jadi pola many-to-many standar
-- di project ini.

CREATE TABLE suppliers (
    id              SERIAL PRIMARY KEY,
    supplier_name   VARCHAR(150) NOT NULL,
    contact_person  VARCHAR(150),
    phone           VARCHAR(50),
    email           VARCHAR(150),
    address         TEXT,
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_suppliers_name UNIQUE (supplier_name)
);

CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);
COMMENT ON TABLE suppliers IS 'Master data supplier/vendor pemasok spare part';

-- ============================================================
-- PART_SUPPLIERS  (many-to-many Part <-> Supplier)
-- ============================================================
CREATE TABLE part_suppliers (
    id              SERIAL PRIMARY KEY,
    part_id         INT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    -- RESTRICT (bukan CASCADE) - supplier gak boleh kehapus diam-diam kalau
    -- masih dipakai di part manapun, harus dilepas dulu satu-satu. Lihat
    -- guard yang sama di lineService.deleteLine (countPartsByLine).
    supplier_id     INT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    -- Ditandai MANUAL oleh user lewat UI (bukan dihitung otomatis dari
    -- histori pembelian atau apa pun) - sesuai keputusan waktu diskusi fitur.
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_part_suppliers UNIQUE (part_id, supplier_id)
);

CREATE INDEX idx_part_suppliers_part_id ON part_suppliers(part_id);
CREATE INDEX idx_part_suppliers_supplier_id ON part_suppliers(supplier_id);

-- Partial unique index - jamin maksimal 1 supplier utama per part di level
-- DB (bukan cuma di application code). Postgres gak dukung subquery di CHECK
-- constraint, jadi partial unique index ini caranya. Service layer
-- (partSupplierService.setPrimary) tetap harus unset yang lama dulu sebelum
-- set yang baru dalam 1 transaction, index ini cuma jaring pengaman kalau
-- ada bug/race condition.
CREATE UNIQUE INDEX uq_part_suppliers_one_primary ON part_suppliers(part_id) WHERE is_primary = TRUE;

COMMENT ON TABLE part_suppliers IS 'Relasi: 1 part fisik bisa dipesen dari beberapa supplier. is_primary ditandai manual oleh user lewat UI, bukan otomatis.';
