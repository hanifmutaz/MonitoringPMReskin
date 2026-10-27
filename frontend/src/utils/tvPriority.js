// src/utils/tvPriority.js
//
// Susunan panel "Prioritas Hari Ini" di Mode TV. Murni (tanpa React/DOM) supaya bisa di-unit-test.
//
// Empat sumber, urut kepentingan:
//   1. PM Line yang jatuh tempo hari ini / sudah lewat, dan Part berstatus Danger   (kind 'pm' / 'part')
//   2. Line tidak running >= batas hari (Settings)                                   (kind 'idle')
//   3. Line dengan ketepatan PM di bawah 100%                                        (kind 'ketepatan')
// Slot di layar TV terbatas. Supaya daftar PM yang panjang tidak menghabiskan semua slot,
// idle & ketepatan masing-masing dijamin dapat minimal RESERVE slot (kalau ada datanya).

export const RESERVE_PER_NEW_KIND = 2;

const fmtPct = (v) => `${Number(v).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;

/** Teks status cleaning Line yang tidak running (sisa hari negatif/0 = wajib cleaning). */
export function cleaningInfo(item) {
  if (item.cleaning_required) {
    const late = Math.abs(item.days_to_cleaning ?? 0);
    return { text: late === 0 ? 'Wajib cleaning hari ini' : `Cleaning telat ${late} hari`, tone: 'danger' };
  }
  if (item.days_to_cleaning === null || item.days_to_cleaning === undefined) return { text: '', tone: 'muted' };
  return { text: `Cleaning ${item.days_to_cleaning} hari lagi`, tone: 'muted' };
}

/** Item "Line tidak running" -> baris prioritas. */
export function idleRow(item) {
  const { text, tone } = cleaningInfo(item);
  return {
    key: `i-${item.line_id}`,
    kind: 'idle',
    title: item.line_name,
    sub: item.never_ran ? `Belum pernah running (${item.idle_days} hari)` : `Tidak running ${item.idle_days} hari`,
    info: text,
    tone,
  };
}

/** Item "ketepatan < 100%" -> baris prioritas. periodLabel mis. 'bulan ini'. */
export function ketepatanRow(item, periodLabel) {
  const pct = Number(item.worst_percentage);
  return {
    key: `k-${item.line_id}`,
    kind: 'ketepatan',
    title: item.line_name,
    sub: `Ketepatan ${item.worst_label || 'PM'} (${periodLabel})`,
    info: fmtPct(pct),
    tone: pct < 50 ? 'danger' : 'warn',
  };
}

/**
 * @param {Array} core - baris PM Line / Part Danger (sudah berurutan, kind 'pm' | 'part')
 * @param {Array} idle - baris kind 'idle' (urut paling lama idle dulu)
 * @param {Array} ketepatan - baris kind 'ketepatan' (urut terburuk dulu)
 * @param {number} slots - jumlah baris maksimal di layar
 * @returns {{shown: Array, hidden: number}}
 */
export function pickPriorityRows({ core = [], idle = [], ketepatan = [], slots }) {
  const reserveIdle = Math.min(idle.length, RESERVE_PER_NEW_KIND);
  const reserveKet = Math.min(ketepatan.length, RESERVE_PER_NEW_KIND);
  const coreTake = Math.min(core.length, Math.max(slots - reserveIdle - reserveKet, 0));

  // Slot sisa dibagi bergantian: idle, ketepatan, idle, ketepatan, ...
  let free = Math.max(slots - coreTake, 0);
  let idleTake = 0;
  let ketTake = 0;
  while (free > 0 && (idleTake < idle.length || ketTake < ketepatan.length)) {
    if (idleTake < idle.length) {
      idleTake += 1;
      free -= 1;
    }
    if (free > 0 && ketTake < ketepatan.length) {
      ketTake += 1;
      free -= 1;
    }
  }

  const shown = [...core.slice(0, coreTake), ...idle.slice(0, idleTake), ...ketepatan.slice(0, ketTake)];
  const total = core.length + idle.length + ketepatan.length;
  return { shown, hidden: total - shown.length };
}
