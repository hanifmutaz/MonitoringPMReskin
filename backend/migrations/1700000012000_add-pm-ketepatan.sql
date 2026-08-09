-- 1700000012000_add-pm-ketepatan.sql
--
-- Fitur "Persentase Ketepatan PM": tiap event PM (ganti Part / input PM
-- Monthly-Weekly) dinilai tepat waktu atau telat SAAT ITU JUGA (dibekukan
-- di baris history, bukan dihitung ulang belakangan dari kondisi sekarang)
-- - supaya nilainya gak berubah kalau Target Shot / threshold di master
-- data/settings diubah di kemudian hari. Disimpan sebagai kolom nullable:
--   TRUE  -> tepat waktu (dihitung 100% saat diagregasi)
--   FALSE -> telat / melewati batas (dihitung 0% saat diagregasi)
--   NULL  -> dikecualikan dari perhitungan ketepatan:
--            - pm_part_history: jenis_penggantian = BROKEN (part gagal
--              duluan di luar kendali jadwal PM - itu soal reliabilitas
--              part, bukan soal keterlambatan operator menjalankan PM)
--            - baris lama (sebelum migration ini jalan) yang belum pernah
--              dihitung saat insert - dianggap "belum ada data ketepatan"
--              alih-alih dipaksa TRUE/FALSE secara retroaktif

ALTER TABLE pm_part_history ADD COLUMN on_time BOOLEAN;
COMMENT ON COLUMN pm_part_history.on_time IS
  'Ketepatan PM dibekukan saat insert. TRUE jika counter_saat_diganti <= target_shot part saat itu, FALSE jika sudah lewat. NULL = jenis_penggantian BROKEN (dikecualikan) atau data lama sebelum fitur ini ada.';

ALTER TABLE pm_monthly_history ADD COLUMN on_time BOOLEAN;
COMMENT ON COLUMN pm_monthly_history.on_time IS
  'Ketepatan PM dibekukan saat insert. WEEKLY: TRUE jika (tgl_input - Tgl Weekly Terakhir sebelumnya) <= pm_weekly_total_days. MONTHLY: TRUE jika akumulasi_poin_monthly sebelum reset ini < pm_monthly_point_cap (belum mentok cap = belum overdue). NULL = data lama sebelum fitur ini ada.';
