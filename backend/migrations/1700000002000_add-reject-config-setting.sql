-- 1700000002000_add-reject-config-setting.sql
--
-- Setting baru: pm_part_counter_include_reject
-- Disetujui langsung oleh pemilik project (18 Jul 2026) saat pembahasan
-- Adapter Sync ConMas — Output Actual (good) dari ConMas TIDAK OTOMATIS
-- sama dengan "jumlah shot yang bikin part aus", karena Reject (F027,
-- F028, M107) tetap menghabiskan 1 siklus tool/die secara fisik.
--
-- TRUE  -> Counter PM Part = Output Actual (good) + SUM(Reject F027+F028+M107)
-- FALSE -> Counter PM Part = Output Actual (good) saja
--
-- Sengaja dibuat SATU toggle general (bukan per jenis reject F027/F028/M107
-- terpisah) sesuai permintaan eksplisit pemilik project — karena belum
-- ada kepastian jenis reject mana yang sebenarnya konsumsi shot fisik,
-- jadi mudah diubah nanti dari halaman Settings begitu dikonfirmasi,
-- tanpa perlu redeploy kode.

INSERT INTO app_settings (key, value, value_type, category, description) VALUES
('pm_part_counter_include_reject', 'true', 'boolean', 'sync_data_produksi',
 'Reject (F027+F028+M107) dihitung sebagai shot terpakai selain Output Actual (good)')
ON CONFLICT (key) DO NOTHING;
