// src/utils/ketepatanLate.js
//
// Format "telat berapa lama" untuk detail Ketepatan PM < 100% (Mode TV). Murni, bisa di-unit-test.
// Bentuk `late` dari backend (lateLineService.buildKetepatanLateEvents):
//   { unit: 'hari', value }                  PM Monthly/Weekly (null untuk data sebelum kolom telat_hari ada)
//   { unit: 'shot', value, percent }         PM Part (counter melewati target)

const fmt = (v, digits = 1) => Number(v).toLocaleString('id-ID', { maximumFractionDigits: digits });

/** Teks lama telat satu event PM. */
export function lateLabel(late) {
  if (!late) return 'Lama telat tidak tercatat';
  if (late.unit === 'shot') {
    const pct = late.percent === null || late.percent === undefined ? '' : ` (${fmt(late.percent)}% di atas target)`;
    return `Telat ${fmt(late.value, 0)} shot${pct}`;
  }
  return Number(late.value) === 0 ? 'Telat kurang dari 1 hari' : `Telat ${fmt(late.value)} hari`;
}

/** Teks alasan telat; data lama (sebelum alasan wajib) diberi keterangan, bukan dikosongkan. */
export function alasanLabel(alasan) {
  const text = typeof alasan === 'string' ? alasan.trim() : '';
  return text || 'Tidak ada alasan (data sebelum fitur ini)';
}

/** Persentase ketepatan, mis. 94.4 -> "94,4%". */
export function pctLabel(v) {
  return v === null || v === undefined ? '-' : `${fmt(v)}%`;
}

/** Tone persentase: < 50 danger, selain itu warn (daftar ini hanya berisi yang < 100%). */
export const belowTargetTone = (v) => (Number(v) < 50 ? 'danger' : 'warn');
