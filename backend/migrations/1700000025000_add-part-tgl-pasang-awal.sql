-- 1700000025000_add-part-tgl-pasang-awal.sql
--
-- Counter/Sisa Shot PM Part (pmPartQueries.buildCounterCte) sebelumnya
-- CUMA bisa mulai dihitung sejak MAX(tgl_ganti) di pm_part_history -
-- artinya Part yang ORISINAL (belum pernah diganti sama sekali sejak
-- awal dipasang) counter-nya NYANGKUT DI 0 SELAMANYA walau Line-nya
-- running terus, karena sistem gak punya tanggal buat mulai ngitung.
-- Ini masalah nyata di rollout awal: minimal 45 Part per Line x puluhan
-- Line, HAMPIR SEMUA Part masih orisinal (belum pernah ada riwayat
-- penggantian) - kalau harus nunggu part pertama kali diganti dulu baru
-- counter mulai jalan, sistem monitoring-nya nggak berguna sama sekali di
-- fase awal ini.
--
-- FIX: tambah kolom tgl_pasang_awal - dipakai sebagai FALLBACK baseline
-- kalau part belum pernah punya riwayat penggantian. Kalau sudah pernah
-- diganti minimal 1x, baseline tetap pakai MAX(tgl_ganti) yang lebih baru
-- (tidak berubah dari perilaku lama) - lihat perubahan query terkait di
-- pmPartQueries.js (commit yang sama dengan migration ini).
--
-- Nullable dengan sengaja (bukan NOT NULL) - part yang SUDAH pernah
-- diganti tidak wajib diisi field ini (baseline dari histori tetap
-- dipakai duluan), dan supaya kolom ini bisa ditambahkan tanpa perlu
-- backfill paksa ke semua Part existing sekarang juga.

ALTER TABLE parts
    ADD COLUMN tgl_pasang_awal DATE;

COMMENT ON COLUMN parts.tgl_pasang_awal IS 'Tanggal Part pertama kali dipasang di mesin. Dipakai sebagai baseline FALLBACK buat hitung Counter/Sisa Shot HANYA kalau Part ini belum pernah punya riwayat penggantian sama sekali di pm_part_history - begitu ada minimal 1 riwayat penggantian, baseline pindah ke MAX(tgl_ganti) yang lebih baru dan kolom ini tidak lagi dipakai untuk perhitungan (tetap tersimpan sebagai catatan historis).';
