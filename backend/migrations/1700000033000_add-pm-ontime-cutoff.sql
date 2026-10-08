-- 1700000033000_add-pm-ontime-cutoff.sql
--
-- "Batas jam PM hari jatuh tempo" untuk penilaian ketepatan PM Monthly/Weekly.
--
-- Masalah: poin dihitung per TANGGAL (ConMas hanya memberi "shift mana yang
-- punya output di tanggal itu"), dan akumulasi menghitung sampai KEMARIN.
-- Shift 1 -> shift 2 -> shift 1 berikutnya tidak punya jeda, jadi poin bisa
-- melewati cap di tengah hari jatuh tempo (mis. sisa 0,5, lalu shift 1 + 2
-- sama-sama jalan = +1,0 => poin mentah cap + 0,5). PM baru bisa dikerjakan
-- sesudah running (~15:00) di hari berikutnya, tapi dinilai TELAT 0,5 padahal
-- tidak ada jeda untuk PM di tengah hari itu.
--
-- Solusi: hari jatuh tempo "diperpanjang" sampai jam batas (default 16:00 WIB)
-- di hari berikutnya. PM yang disubmit SEBELUM jam batas dinilai dengan poin
-- mentah SEBELUM hari jatuh tempo itu (= poin mentah tanpa hari terakhir yang
-- dihitung). Kolom *_raw_prev menyimpan angka itu, diisi job accrual.
--
-- Set '00:00' untuk mematikan toleransi (perilaku lama).
--
-- Nullable: terisi setelah job accrual berikutnya jalan. Selama NULL, tidak ada
-- toleransi (aturan ketat).

ALTER TABLE pm_monthly_helper
  ADD COLUMN akumulasi_poin_monthly_raw_prev NUMERIC(8,1) CHECK (akumulasi_poin_monthly_raw_prev IS NULL OR akumulasi_poin_monthly_raw_prev >= 0),
  ADD COLUMN akumulasi_poin_weekly_raw_prev  NUMERIC(8,1) CHECK (akumulasi_poin_weekly_raw_prev  IS NULL OR akumulasi_poin_weekly_raw_prev  >= 0);

COMMENT ON COLUMN pm_monthly_helper.akumulasi_poin_monthly_raw_prev IS 'Poin Monthly mentah SEBELUM hari terakhir yang dihitung (kemarin). Dipakai untuk toleransi jam batas PM (pm_ontime_cutoff_time).';
COMMENT ON COLUMN pm_monthly_helper.akumulasi_poin_weekly_raw_prev  IS 'Poin Weekly mentah SEBELUM hari terakhir yang dihitung (kemarin). Dipakai untuk toleransi jam batas PM (pm_ontime_cutoff_time).';

INSERT INTO app_settings (key, value, value_type, category, description) VALUES
('pm_ontime_cutoff_time', '16:00', 'text', 'skema_poin_monthly', 'Batas jam (WIB) PM masih dianggap tepat waktu di hari setelah jatuh tempo. PM sebelum jam ini dinilai tanpa poin hari jatuh tempo. 00:00 = nonaktif')
ON CONFLICT (key) DO NOTHING;
