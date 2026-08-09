-- 1700000010000_add-inventory-rop.sql
--
-- Rumus ROP & Safety Stock (Q2/Q3, akhirnya FIX setelah reverse-engineer
-- dari SparePart.xlsm sheet P1 & Monitoring, dikonfirmasi user):
--
--   Konsumsi Spare/Hari (per Part) = usage_per_day (Pemakaian/Hari AKTUAL,
--     sudah dihitung dinamis oleh pmPartService dari data sync ConMas -
--     BUKAN angka target statis) / target_shot (Life Time part itu)
--
--   Konsumsi Spare/Hari (per Inventory Item) = SUM Konsumsi Spare/Hari dari
--     SEMUA Part yang di-link ke Item itu (many-to-one, konsisten dengan
--     prinsip agregasi penuh yang sudah dipakai di seluruh sistem ini -
--     lihat pmPartQueries counter cross-CL)
--
--   Kebutuhan Spare = CEIL(Konsumsi Spare/Hari(item) x Lead Time)
--   Safety Stock    = CEIL(inventory_safety_stock_percentage% x Kebutuhan Spare)
--   ROP             = Kebutuhan Spare + Safety Stock
--   Order Qty       = MAX(ROP - Stock Saat Ini, 0)
--   Status          = Stock Saat Ini <= ROP -> "ORDER", selain itu -> "OK"
--
-- Lead Time BEDA per Inventory Item (dikonfirmasi user - part lokal vs
-- import beda lead time), jadi WAJIB kolom per-item, bukan setting global.
-- Safety Stock percentage dibikin SETTING (bisa diubah Admin), bukan
-- hardcode 20% - default tetap 20% sesuai yang ditemukan di file Excel.

ALTER TABLE inventory_items ADD COLUMN lead_time_days INT CHECK (lead_time_days IS NULL OR lead_time_days >= 0);

COMMENT ON COLUMN inventory_items.lead_time_days IS 'Lead time pengadaan (hari) khusus item ini - beda-beda per supplier/part (lokal vs import). NULL = ROP belum bisa dihitung untuk item ini, Admin wajib isi dulu lewat Master Data Inventory.';

INSERT INTO app_settings (key, value, value_type, category, description) VALUES
('inventory_safety_stock_percentage', '20', 'number', 'inventory', 'Persentase Safety Stock dari Kebutuhan Spare (default 20%, hasil reverse-engineer dari data existing)')
ON CONFLICT (key) DO NOTHING;

-- Perluas notification_log buat notifikasi Inventory ORDER (menyusul PM_PART_DANGER)
ALTER TABLE notification_log DROP CONSTRAINT notification_log_notification_type_check;
ALTER TABLE notification_log ADD CONSTRAINT notification_log_notification_type_check
    CHECK (notification_type IN ('PM_PART_DANGER', 'INVENTORY_ORDER'));

INSERT INTO app_settings (key, value, value_type, category, description) VALUES
('notif_inventory_enabled', 'true', 'boolean', 'notifikasi', 'Aktifkan notifikasi email saat Inventory Item berstatus ORDER (stok <= ROP)'),
('notif_inventory_recipient_roles', 'Admin', 'text', 'notifikasi', 'Role penerima email notifikasi Inventory ORDER, pisah koma kalau lebih dari 1'),
('notif_inventory_interval_hours', '24', 'number', 'notifikasi', 'Jeda reminder (jam) sebelum email yang sama dikirim ulang untuk Item yang masih ORDER'),
('notif_inventory_repeat', 'true', 'boolean', 'notifikasi', 'TRUE = kirim reminder berkala selama Item masih ORDER. FALSE = kirim sekali saja per kejadian ORDER')
ON CONFLICT (key) DO NOTHING;
