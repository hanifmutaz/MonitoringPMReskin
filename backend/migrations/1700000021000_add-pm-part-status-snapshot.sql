-- 1700000021000_add-pm-part-status-snapshot.sql
--
-- LATAR BELAKANG (menutup TECHNICAL_DEBT.md #1 — lihat komentar di
-- pmPartService.pagination.test.js dan doc/Architecture.md bagian
-- "Aturan yang paling ditegakkan konsisten"):
--
-- listPmPart() dengan filter `status` TIDAK BISA memfilter+paginate di
-- level SQL, karena status (OK/WARNING/DANGER) adalah hasil formula
-- (pmPartService.computeMetrics()) yang SENGAJA ditaruh di Service layer,
-- bukan SQL layer (Development Rules §7: business logic tidak boleh ada
-- di SQL). Konsekuensinya jalur ini harus compute counter untuk SEMUA
-- part aktif di SEMUA line dulu, baru filter+slice di JS
-- (pmPartService.getAllComputedMetrics() dipanggil tanpa lineId/limit).
--
-- Diukur langsung (dummy data setara ~4 tahun histori, 150 line, 4.500
-- part, 1,3 juta row production_cache): jalur ini makan ~8,7 DETIK per
-- request — dan akan terus memburuk seiring production_cache bertambah
-- (tidak ada job purge/retention untuk tabel itu).
--
-- FIX: bukan mindahin formula ke SQL (itu akan melanggar aturan Dev Rules
-- §7 di atas), tapi pola yang SAMA PERSIS dengan ADR 006
-- (pmMonthlyAccrualService.recomputeAllLines()) — Service layer tetap
-- yang menghitung formula, hasilnya di-snapshot ke tabel ini oleh
-- scheduled job (jobs/conmasSyncJob.js, jalan bareng ConMas sync karena
-- sama-sama butuh production_cache terbaru). listPmPart() dengan filter
-- status baca dari snapshot ini (WHERE status = $1, indexed, SQL-level
-- pagination) - bukan compute on-demand tiap request.
--
-- TRADE-OFF YANG DISADARI: status yang dibaca dari snapshot ini bisa
-- "telat" maksimal selama sync_interval_minutes (default 30 menit) —
-- sama persis trade-off yang sudah diterima untuk akumulasi_poin_monthly
-- di pm_monthly_helper. Jalur TANPA filter status (findAllWithCounter)
-- TETAP real-time seperti sebelumnya, tidak diubah - snapshot ini HANYA
-- dipakai saat filter status aktif.

CREATE TABLE pm_part_status_snapshot (
    part_id             INT PRIMARY KEY REFERENCES parts(id) ON DELETE CASCADE,
    line_id             INT NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
    counter             BIGINT NOT NULL,
    remaining_shot      BIGINT NOT NULL,
    usage_per_day       NUMERIC(12,2) NOT NULL,
    estimated_pm_date   DATE,
    status              VARCHAR(10) NOT NULL CHECK (status IN ('OK','WARNING','DANGER')),
    wear_percentage     INT NOT NULL,
    last_tgl_ganti      DATE,
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Query utama: WHERE status = ? [AND line_id = ?] ORDER BY ... LIMIT/OFFSET
CREATE INDEX idx_pm_part_status_snapshot_status ON pm_part_status_snapshot(status);
CREATE INDEX idx_pm_part_status_snapshot_line_status ON pm_part_status_snapshot(line_id, status);

COMMENT ON TABLE pm_part_status_snapshot IS 'Snapshot hasil pmPartService.computeMetrics() per part, ditulis ulang penuh (full recompute, idempotent - konsisten dengan ADR 006) oleh scheduled job tiap sync ConMas jalan. HANYA dipakai untuk jalur listPmPart() dengan filter status (supaya bisa WHERE+LIMIT/OFFSET di SQL) - bukan sumber kebenaran, bukan dipakai di detail part (getPmPartDetail tetap compute real-time dari production_cache).';
COMMENT ON COLUMN pm_part_status_snapshot.computed_at IS 'Kapan baris ini terakhir dihitung ulang. Dipakai untuk mendeteksi kalau job recompute berhenti jalan (mis. alert kalau computed_at semua baris lebih tua dari 2x sync_interval_minutes).';
