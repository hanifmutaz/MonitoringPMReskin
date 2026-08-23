-- 1700000020000_add-production-cache-synced-at-index.sql
--
-- LATAR BELAKANG:
-- dashboardQueries.getLastSyncInfo() dipanggil setiap kali dashboard
-- dibuka, dan melakukan MAX(synced_at) dua kali terhadap production_cache
-- tanpa index di kolom synced_at. Diukur langsung (dummy data 1,3 juta row
-- production_cache, setara ~4 tahun histori 150 line): query ini
-- menghasilkan 3x Parallel Seq Scan penuh ke production_cache, ~590ms per
-- panggilan. Tanpa index ini, angka itu akan terus naik seiring
-- production_cache bertambah (tidak ada job purge/retention untuk tabel
-- ini saat ini — lihat services/conmasSyncService.js, sync_lookback_days
-- di app_settings hanya mengontrol seberapa jauh sync MENARIK data baru,
-- bukan berapa lama data lama disimpan).

CREATE INDEX idx_production_cache_synced_at ON production_cache(synced_at DESC);

COMMENT ON INDEX idx_production_cache_synced_at IS 'Menopang dashboardQueries.getLastSyncInfo() (MAX(synced_at) + COUNT WHERE synced_at = MAX) yang dipanggil tiap dashboard load. Tanpa ini, query melakukan sequential scan penuh ke production_cache.';
