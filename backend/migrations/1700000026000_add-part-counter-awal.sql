-- 1700000026000_add-part-counter-awal.sql
--
-- Rollout awal: tanggal pasang Part yang sudah berjalan sering tidak bisa
-- dipastikan (data lama tidak rapi). Sebagai gantinya, Counter dimulai dari
-- "posisi shot per tanggal cutoff" yang diisi manual/lewat import Excel:
--
--   counter_awal          = jumlah shot yang sudah terpakai per AKHIR HARI
--                           counter_awal_tanggal (produksi hari itu sudah
--                           termasuk di angka ini).
--   counter_awal_tanggal  = tanggal cutoff. Produksi mulai dihitung otomatis
--                           dari HARI SESUDAHNYA (tanggal > cutoff).
--
-- Rumus (lihat pmPartQueries.buildCounterCte), hanya selama Part belum punya
-- riwayat penggantian SESUDAH tanggal cutoff:
--   counter = counter_awal + SUM(output_actual WHERE tanggal > counter_awal_tanggal)
-- Begitu ada riwayat penggantian dengan tgl_ganti > cutoff, offset ini tidak
-- dipakai lagi (baseline pindah ke MAX(tgl_ganti)), sama seperti pola
-- tgl_pasang_awal (migration 1700000025000).
--
-- Keduanya nullable: Part existing tanpa nilai ini berperilaku persis seperti
-- sebelumnya (fallback ke tgl_pasang_awal).

ALTER TABLE parts
    ADD COLUMN counter_awal         BIGINT CHECK (counter_awal IS NULL OR counter_awal >= 0),
    ADD COLUMN counter_awal_tanggal DATE;

ALTER TABLE parts
    ADD CONSTRAINT chk_parts_counter_awal_pair
    CHECK ((counter_awal IS NULL) = (counter_awal_tanggal IS NULL));

COMMENT ON COLUMN parts.counter_awal IS 'Shot yang sudah terpakai per akhir hari counter_awal_tanggal (posisi awal saat mulai monitoring). Diisi berpasangan dengan counter_awal_tanggal.';
COMMENT ON COLUMN parts.counter_awal_tanggal IS 'Tanggal cutoff counter_awal. Produksi dihitung dari tanggal SETELAH ini. Diabaikan begitu Part punya riwayat penggantian dengan tgl_ganti lebih baru.';
