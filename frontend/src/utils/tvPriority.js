// src/utils/tvPriority.js
//
// Susunan panel "Prioritas Hari Ini" di Mode TV. Murni (tanpa React/DOM) supaya bisa di-unit-test.
//
// Dua sumber, urut kepentingan:
//   1. PM Line yang jatuh tempo hari ini / sudah lewat, dan Part berstatus Danger   (kind 'pm' / 'part')
//   2. Line tidak running yang cleaning-nya SUDAH jatuh tempo (hari ini / telat)    (kind 'idle')
// Yang BELUM jatuh tempo tidak masuk sini: cleaning terdekat tampil di panel sendiri
// ("Cleaning Line Tidak Running", lihat splitIdleByCleaning) dan Line dengan ketepatan PM < 100%
// tampil di panel "Ketepatan PM < 100%" (bisa diklik untuk detail telat + alasannya).
// Slot di layar TV terbatas. Supaya daftar PM yang panjang tidak menghabiskan semua slot,
// idle dijamin dapat minimal RESERVE_IDLE slot (kalau ada datanya).

export const RESERVE_IDLE = 2;

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

/**
 * Pisahkan Line tidak running jadi dua kelompok:
 *  - priority: cleaning sudah jatuh tempo (hari ini / telat) -> masuk "Prioritas Hari Ini"
 *  - upcoming: cleaning belum jatuh tempo -> panel "Cleaning Line Tidak Running",
 *    urut paling dekat dulu (days_to_cleaning kecil), tanpa tanggal ditaruh paling bawah.
 */
export function splitIdleByCleaning(items = []) {
  const priority = [];
  const upcoming = [];
  for (const item of items) (item.cleaning_required ? priority : upcoming).push(item);
  const key = (i) => (i.days_to_cleaning === null || i.days_to_cleaning === undefined ? Infinity : Number(i.days_to_cleaning));
  upcoming.sort((a, b) => key(a) - key(b) || Number(b.idle_days) - Number(a.idle_days));
  return { priority, upcoming };
}

/** Default batas warna panel Cleaning (hari); nilai aslinya dari Settings, dikirim backend di config idle-lines. */
export const CLEANING_WARN_DAYS = 14;
export const CLEANING_DANGER_DAYS = 7;

/**
 * Batas warna dari config backend ({warnDays, dangerDays}). Kosong/tidak valid -> default.
 * Kalau terbalik (danger > warn) ditukar, supaya merah selalu lebih dekat dari kuning.
 */
export function resolveCleaningThresholds(config) {
  const num = (v, fallback) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? fallback : Number(v));
  const a = num(config?.dangerDays, CLEANING_DANGER_DAYS);
  const b = num(config?.warnDays, CLEANING_WARN_DAYS);
  return { dangerDays: Math.min(a, b), warnDays: Math.max(a, b) };
}

/** Tone sisa hari cleaning: <= danger merah, <= warn kuning, selain itu muted. Tanpa tanggal -> muted. */
export function cleaningTone(days, thresholds) {
  if (days === null || days === undefined) return 'muted';
  const { dangerDays, warnDays } = resolveCleaningThresholds(thresholds);
  const n = Number(days);
  if (n <= dangerDays) return 'danger';
  if (n <= warnDays) return 'warn';
  return 'muted';
}

/** Item cleaning terdekat -> baris tabel panel TV. thresholds = {warnDays, dangerDays} dari Settings. */
export function cleaningUpcomingRow(item, thresholds) {
  const days = item.days_to_cleaning;
  const hasDays = days !== null && days !== undefined;
  return {
    key: `c-${item.line_id}`,
    line: item.line_name,
    idle: item.never_ran ? `Belum pernah (${item.idle_days} hr)` : `${item.idle_days} hari`,
    sisa: hasDays ? (Number(days) === 0 ? 'Hari ini' : `${days} hari`) : '-',
    tone: cleaningTone(days, thresholds),
  };
}

/**
 * @param {Array} core - baris PM Line / Part Danger (sudah berurutan, kind 'pm' | 'part')
 * @param {Array} idle - baris kind 'idle' (urut paling lama idle dulu)
 * @param {number} slots - jumlah baris maksimal di layar
 * @param {number} [reserveIdle] - slot minimal untuk idle (default RESERVE_IDLE)
 * @returns {{shown: Array, hidden: number}}
 */
export function pickPriorityRows({ core = [], idle = [], slots, reserveIdle = RESERVE_IDLE }) {
  const reserved = Math.min(idle.length, reserveIdle);
  const coreTake = Math.min(core.length, Math.max(slots - reserved, 0));
  const idleTake = Math.min(idle.length, Math.max(slots - coreTake, 0));

  const shown = [...core.slice(0, coreTake), ...idle.slice(0, idleTake)];
  return { shown, hidden: core.length + idle.length - shown.length };
}
