-- ============================================================
-- Pindahkan data dari LINE LAMA (di Recycle Bin) ke LINE BARU (aktif,
-- nama sama), supaya line lama bisa dihapus permanen.
--
-- Dipindah : parts, pm_monthly_history, production_cache,
--            pm_monthly_helper (kalau line baru belum punya),
--            pm_part_status_snapshot (line_id ikut diperbarui)
-- Dilewati : part AKTIF yang bentrok (Line+Jig+Drawing sama sudah ada di
--            line baru) -> ditampilkan di langkah 2, bereskan manual.
--
-- DEFAULT = DRY RUN: script diakhiri ROLLBACK. Baca hasil langkah 1-5,
-- kalau sudah oke ganti baris terakhir jadi COMMIT lalu jalankan ulang.
-- SEBELUM COMMIT: backup database dulu.
--
-- Jalankan:  psql -U pm_app -d pm_monitoring -f pindah-part-ke-line-baru.sql
-- ============================================================
BEGIN;

CREATE TEMP TABLE line_map ON COMMIT DROP AS
SELECT ol.id AS old_id, nl.id AS new_id, ol.line_name
FROM lines ol
JOIN lines nl ON nl.line_name = ol.line_name AND nl.deleted_at IS NULL
WHERE ol.deleted_at IS NOT NULL;

\echo '--- 1. Pemetaan line lama -> line baru (nama sama)'
SELECT * FROM line_map ORDER BY line_name;

\echo '--- 2. Part AKTIF yang bentrok di line baru (TIDAK akan dipindah)'
SELECT m.line_name, p.id AS part_id, p.jig_name, p.drawing_no
FROM line_map m
JOIN parts p ON p.line_id = m.old_id AND p.deleted_at IS NULL
WHERE EXISTS (
  SELECT 1 FROM parts x
  WHERE x.line_id = m.new_id AND x.jig_name = p.jig_name
    AND x.drawing_no = p.drawing_no AND x.deleted_at IS NULL
);

-- Parts (termasuk yang sudah di Recycle Bin, karena tetap menahan FK)
UPDATE parts p SET line_id = m.new_id
FROM line_map m
WHERE p.line_id = m.old_id
  AND NOT (
    p.deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM parts x
      WHERE x.line_id = m.new_id AND x.jig_name = p.jig_name
        AND x.drawing_no = p.drawing_no AND x.deleted_at IS NULL
    )
  );

-- History PM Monthly/Weekly (FK RESTRICT ke lines)
UPDATE pm_monthly_history h SET line_id = m.new_id
FROM line_map m WHERE h.line_id = m.old_id;

-- Snapshot status part: ikutkan line_id part-nya
UPDATE pm_part_status_snapshot s SET line_id = p.line_id
FROM parts p WHERE p.id = s.part_id AND s.line_id <> p.line_id;

-- Cache produksi: buang baris lama yang bentrok (data line baru lebih segar
-- karena baru disinkronkan), sisanya dipindah supaya counter part tidak turun.
DELETE FROM production_cache o
USING line_map m
WHERE o.line_id = m.old_id
  AND EXISTS (SELECT 1 FROM production_cache n
              WHERE n.line_id = m.new_id AND n.cl_no = o.cl_no AND n.tanggal = o.tanggal);
UPDATE production_cache o SET line_id = m.new_id
FROM line_map m WHERE o.line_id = m.old_id;

-- Helper poin PM bulanan: 1 baris per line (UNIQUE) -> pindah hanya kalau line baru belum punya
UPDATE pm_monthly_helper h SET line_id = m.new_id
FROM line_map m
WHERE h.line_id = m.old_id
  AND NOT EXISTS (SELECT 1 FROM pm_monthly_helper x WHERE x.line_id = m.new_id);

\echo '--- 3. Sisa Part yang masih nyangkut ke line lama (harus 0, kecuali yang bentrok di langkah 2)'
SELECT l.line_name, count(*) AS parts_tersisa
FROM parts p JOIN lines l ON l.id = p.line_id
WHERE l.deleted_at IS NOT NULL GROUP BY l.line_name;

\echo '--- 4. Sisa History PM yang masih nyangkut ke line lama (harus kosong)'
SELECT l.line_name, count(*) AS history_tersisa
FROM pm_monthly_history h JOIN lines l ON l.id = h.line_id
WHERE l.deleted_at IS NOT NULL GROUP BY l.line_name;

\echo '--- 5. Jumlah Part aktif per line baru sekarang'
SELECT l.line_name, count(*) FILTER (WHERE p.deleted_at IS NULL) AS parts_aktif
FROM lines l JOIN parts p ON p.line_id = l.id
WHERE l.deleted_at IS NULL AND l.line_name IN (SELECT line_name FROM line_map)
GROUP BY l.line_name ORDER BY l.line_name;

-- Ganti ke COMMIT; setelah hasil di atas sudah sesuai.
ROLLBACK;
