// src/utils/accrualLookback.js
//
// Rentang hari ke belakang untuk query run-count ConMas di job akrual poin.
// Akrual dihitung dari (Tgl PM Terakhir, hari ini], jadi rentang query HARUS
// mencakup baseline tertua. Kalau cuma pakai sync_lookback_days (default 90),
// Line dengan Tgl PM Monthly lebih tua dari itu poinnya under-count.

/**
 * @param {number|null|undefined} settingDays   app_settings.sync_lookback_days
 * @param {number|null|undefined} oldestBaselineDays  hari sejak baseline tertua (null = tidak ada baseline)
 * @returns {number} max(setting atau 90, baseline tertua + 1)
 */
function computeLookbackDays(settingDays, oldestBaselineDays) {
  const base = Number(settingDays) > 0 ? Number(settingDays) : 90;
  if (oldestBaselineDays === null || oldestBaselineDays === undefined) return base;
  const oldest = Number(oldestBaselineDays);
  if (Number.isNaN(oldest)) return base;
  return Math.max(base, oldest + 1);
}

module.exports = { computeLookbackDays };
