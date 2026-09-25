// src/utils/todayString.js
//
// Fix anomali "pilih tanggal H, kesimpen jadi H-1" pada form Input PM
// Monthly/Weekly (PmLineHistoryForm.jsx & PmPartHistoryForm.jsx) dan Ganti
// Part. Root cause: kedua form itu pakai
//   `new Date().toISOString().slice(0, 10)`
// buat default value + `max` attribute <input type="date">.
// `.toISOString()` SELALU ngambil tanggal UTC, bukan WIB - karena WIB =
// UTC+7, di jam dini hari WIB (00:00-06:59) UTC masih tanggal KEMARIN.
// Efeknya: `max` ke-set ke H-1, jadi browser clamp balik ke H-1 begitu user
// pilih tanggal hari ini (H) di date picker - persis gejala yang dilaporin
// ("pilih 7 Juli jadi kesimpen 6 Juli").
//
// backend/src/utils/dateUtils.js udah eksplisit ngelarang pola
// `new Date(...)` naive kayak gini dan wajib lewat dayjs timezone
// Asia/Jakarta - util ini nerapin aturan yang sama di sisi frontend,
// dipisah biar reusable & jadi SATU sumber kebenaran (pola sama dengan
// formatDate.js), bukan didefinisikan ulang per-form (itu penyebab bug ini
// pertama kali - 2 form independen definisiin todayStr() sendiri-sendiri).

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Jakarta';

/**
 * Tanggal hari ini di WIB (Asia/Jakarta), format 'YYYY-MM-DD'.
 * WAJIB dipakai untuk default value & `max` di <input type="date"> yang
 * merepresentasikan "hari ini tidak boleh dilewati" - JANGAN
 * `new Date().toISOString().slice(0, 10)`.
 * @example todayString() -> '2026-07-07' (bukan '2026-07-06' walau baru jam 02:00 WIB)
 */
export function todayString() {
  return dayjs().tz(TZ).format('YYYY-MM-DD');
}

export default todayString;
