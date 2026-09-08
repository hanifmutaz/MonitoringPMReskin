// src/utils/formatDate.js
// ============================================================
// Util format tanggal TERPUSAT (Fase 1 - A1 / D3).
// LOCK format: `DD MMM YYYY` (contoh: 04 Jul 2026).
//
// Kenapa terpusat: sebelumnya tiap tabel render Date apa adanya -> muncul
// ISO mentah `2026-07-04T17:00:00.000Z` di History PM Part/Line, Audit Log,
// dll. Satu util ini jadi SUMBER KEBENARAN format tanggal buat SEMUA halaman.
//
// Pakai `dayjs` + locale `id` (udah keinstall, udah dipakai di
// GanttUpcomingPanel.jsx). Nol dependency baru.
//
// SEMUA fungsi aman terhadap input null/undefined/invalid -> balikin '-'
// (bukan "Invalid Date" yang jelek di UI). Ini penting karena banyak kolom
// tanggal yang nullable (mis. last_tgl_ganti part yang belum pernah diganti).
// ============================================================

import dayjs from 'dayjs';
import 'dayjs/locale/id';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('id');
dayjs.extend(relativeTime);

// Placeholder tunggal buat semua nilai kosong/invalid. Ubah di sini kalau
// mau ganti (mis. jadi '—' em-dash) - otomatis konsisten di seluruh app.
const EMPTY = '-';

// Guard internal: parse & validasi. Balikin dayjs obj valid, atau null.
function parse(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = dayjs(value);
  return d.isValid() ? d : null;
}

/**
 * Tanggal saja. LOCK format `DD MMM YYYY`.
 * @example formatDate('2026-07-04T17:00:00.000Z') -> '05 Jul 2026'
 * @example formatDate(null) -> '-'
 */
export function formatDate(value) {
  const d = parse(value);
  return d ? d.format('DD MMM YYYY') : EMPTY;
}

/**
 * Tanggal + jam. Format `DD MMM YYYY, HH:mm` (24 jam).
 * Buat kolom yang butuh presisi waktu (Audit Log, timestamp mutasi).
 * @example formatDateTime('2026-07-04T08:30:00Z') -> '04 Jul 2026, 15:30'
 */
export function formatDateTime(value) {
  const d = parse(value);
  return d ? d.format('DD MMM YYYY, HH:mm') : EMPTY;
}

/**
 * Relatif dari sekarang (locale id). Buat "terakhir sync", "diubah ...".
 * @example formatRelative(dayjs().subtract(3,'day')) -> '3 hari yang lalu'
 */
export function formatRelative(value) {
  const d = parse(value);
  return d ? d.fromNow() : EMPTY;
}

/**
 * Khusus key harian (mis. join production_cache / kolom `tanggal`).
 * Format ISO `YYYY-MM-DD` - BUKAN buat display, tapi buat konsistensi
 * key/query di sisi FE. Dipisah biar nggak ketuker sama format display.
 */
export function toDateKey(value) {
  const d = parse(value);
  return d ? d.format('YYYY-MM-DD') : null;
}

// Default export = formatDate (paling sering dipakai), biar bisa
// `import formatDate from '../utils/formatDate'` kalau mau ringkas.
export default formatDate;
