-- 1700000038000_add-telat-hari-pm-monthly-history.sql
--
-- Lama keterlambatan PM Monthly/Weekly yang dinilai telat (on_time = FALSE).
-- Dicatat SAAT PM disubmit = poin mentah Line (tanpa cap) dikurangi batas cap, dalam satuan
-- hari (sama dengan "Sisa Hari" negatif di Monitoring). Dipakai detail "Ketepatan PM < 100%"
-- di Mode TV supaya bisa menjawab "telat berapa lama".
--
-- Nullable: baris lama (sebelum kolom ini ada), PM tepat waktu, dan PM telat yang poin
-- mentahnya tidak tersedia saat submit tidak punya nilai. PM Part TIDAK butuh kolom ini:
-- lama telatnya bisa dihitung dari counter_saat_diganti - target_shot yang sudah tersimpan.

ALTER TABLE pm_monthly_history ADD COLUMN telat_hari NUMERIC(6,1);
COMMENT ON COLUMN pm_monthly_history.telat_hari IS
  'Lama telat PM Monthly/Weekly (hari = poin mentah - cap) saat disubmit. NULL untuk PM tepat waktu, data lama, atau poin mentah tidak tersedia.';
