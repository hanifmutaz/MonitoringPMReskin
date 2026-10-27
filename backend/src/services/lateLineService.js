// src/services/lateLineService.js
//
// Line yang TERLAMBAT PM + evidence-nya (data sistem, bukan upload file).
//
// "Terlambat" saat ini (live):
//   - PM Monthly/Weekly : status OVERDUE (poin mentah sudah melewati cap -> Sisa Hari < 0)
//   - PM Part           : counter sudah melewati target shot (remaining_shot < 0)
// Line yang tidak running TETAP muncul di sini kalau PM-nya sudah terlambat
// (PM tetap wajib dikerjakan); mereka hanya disaring dari Jadwal PM 7 Hari ke Depan.
//
// Evidence per Line = angka yang membuktikan keterlambatan (poin vs cap, tanggal
// PM terakhir, counter vs target), output harian 14 hari terakhir dari
// production_cache, dan riwayat PM telat 90 hari terakhir beserta alasannya.

const pmLineService = require('./pmLineService');
const dashboardService = require('./dashboardService');
const lineIdleService = require('./lineIdleService');
const lineIdleQueries = require('../sql/lineIdleQueries');
const pmLineHistoryQueries = require('../sql/pmLineHistoryQueries');
const pmPartHistoryQueries = require('../sql/pmPartHistoryQueries');
const { computeIdleStatus } = require('../utils/lineIdle');
const settingsService = require('./settingsService');
const dateUtils = require('../utils/dateUtils');
const { clampFrom } = require('../utils/ketepatanStart');
const AppError = require('../utils/AppError');

const OUTPUT_DAYS = 14;
const LATE_EVENT_DAYS = 90;

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Item terlambat PM Monthly/Weekly dari 1 baris status Line. Fungsi murni.
 * @returns {Array<object>}
 */
function lateItemsFromLineStatus(l, thresholds) {
  const items = [];
  const cycles = [
    { jenis: 'MONTHLY', label: 'PM Monthly', cap: thresholds.monthlyCap },
    { jenis: 'WEEKLY', label: 'PM Weekly', cap: thresholds.weeklyTotalDays },
  ];
  for (const c of cycles) {
    const key = c.jenis.toLowerCase();
    if (l[`status_${key}`] !== 'OVERDUE') continue;
    const sisa = l[`sisa_hari_${key}`];
    items.push({
      type: `PM_LINE_${c.jenis}`,
      label: c.label,
      late_by_days: sisa === null ? null : round1(Math.abs(sisa)),
      last_pm_date: l[`tgl_pm_${key}_terakhir`],
      poin_raw: l[`akumulasi_poin_${key}_raw`],
      poin_cap: c.cap,
      sisa_hari: sisa,
    });
  }
  return items;
}

/** Item terlambat PM Part dari 1 baris metrik Part. Fungsi murni. */
function lateItemFromPartMetric(p) {
  if (!(p.remaining_shot < 0)) return null;
  const overShot = Math.abs(p.remaining_shot);
  return {
    type: 'PM_PART',
    label: p.part_name,
    drawing_no: p.drawing_no,
    late_by_days: p.usage_per_day > 0 ? round1(overShot / p.usage_per_day) : null,
    last_pm_date: p.last_tgl_ganti,
    counter: p.counter,
    target_shot: p.target_shot,
    over_shot: overShot,
    usage_per_day: p.usage_per_day,
  };
}

async function loadLateItemsByLine() {
  const [thresholds, lineStatuses, partMetrics] = await Promise.all([
    pmLineService.getThresholds(),
    // Pakai cache dashboard (TTL singkat): hitung semua Part itu mahal (lihat TECHNICAL_DEBT #1).
    dashboardService.getCachedLineStatuses(),
    dashboardService.getCachedPartMetrics(),
  ]);

  const byLine = new Map(); // line_id -> { line_id, line_name, items[] }
  const ensure = (id, name) => {
    if (!byLine.has(id)) byLine.set(id, { line_id: id, line_name: name, items: [] });
    return byLine.get(id);
  };

  for (const l of lineStatuses) {
    const items = lateItemsFromLineStatus(l, thresholds);
    if (items.length) ensure(l.line_id, l.line_name).items.push(...items);
  }
  for (const p of partMetrics) {
    const item = lateItemFromPartMetric(p);
    if (item) ensure(p.line_id, p.line_name).items.push(item);
  }
  return byLine;
}

/** Daftar Line terlambat (ringkas) untuk panel Dashboard. */
async function getLateLines() {
  const [byLine, idle] = await Promise.all([loadLateItemsByLine(), lineIdleService.getIdleLines()]);
  const idleIds = new Set(idle.items.map((i) => i.line_id));

  const result = Array.from(byLine.values()).map((entry) => {
    const days = entry.items.map((i) => i.late_by_days).filter((d) => d !== null);
    return {
      line_id: entry.line_id,
      line_name: entry.line_name,
      is_idle: idleIds.has(entry.line_id),
      total_late: entry.items.length,
      max_late_days: days.length ? Math.max(...days) : null,
      types: Array.from(new Set(entry.items.map((i) => i.type))),
    };
  });

  // Paling telat dulu; yang telatnya tidak terukur (tanpa pemakaian) di bawah.
  result.sort(
    (a, b) =>
      (b.max_late_days ?? -1) - (a.max_late_days ?? -1) ||
      b.total_late - a.total_late ||
      a.line_name.localeCompare(b.line_name)
  );
  return result;
}

/** Output harian OUTPUT_DAYS hari terakhir, hari tanpa data diisi 0 supaya grafik tidak bolong. */
function fillDailyOutput(rows, todayStr, days) {
  const map = new Map(rows.map((r) => [r.tanggal, r.output]));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = dateUtils.parseDbDate(todayStr).subtract(i, 'day').format(dateUtils.DATE_FORMAT);
    out.push({ tanggal: d, output: map.get(d) || 0 });
  }
  return out;
}

/** Evidence keterlambatan 1 Line. */
async function getLateLineEvidence(lineId) {
  const byLine = await loadLateItemsByLine();
  const lineRows = await lineIdleQueries.findLineActivity();
  const line = lineRows.find((r) => r.line_id === lineId);
  if (!line) throw AppError.notFound('Line tidak ditemukan');

  const todayStr = dateUtils.todayString();
  const cfg = await lineIdleService.getIdleConfig();
  const idle = cfg.enabled ? computeIdleStatus(line, cfg, todayStr) : { is_idle: false };

  const outputFrom = dateUtils.parseDbDate(todayStr).subtract(OUTPUT_DAYS - 1, 'day').format(dateUtils.DATE_FORMAT);
  const eventsFrom = dateUtils.parseDbDate(todayStr).subtract(LATE_EVENT_DAYS, 'day').format(dateUtils.DATE_FORMAT);

  const [dailyRows, lineEvents, partEvents] = await Promise.all([
    lineIdleQueries.findDailyOutput({ lineId, dateFrom: outputFrom }),
    pmLineHistoryQueries.findLateEvents({ lineId, dateFrom: eventsFrom }),
    pmPartHistoryQueries.findLateEventsByLine({ lineId, dateFrom: eventsFrom }),
  ]);

  const recentLateEvents = [
    ...lineEvents.map((e) => ({
      source: e.jenis_pm === 'WEEKLY' ? 'PM_LINE_WEEKLY' : 'PM_LINE_MONTHLY',
      label: e.jenis_pm === 'WEEKLY' ? 'PM Weekly' : 'PM Monthly',
      tanggal: e.tgl_input,
      pic_name: e.pic_name,
      alasan_telat: e.alasan_telat,
      catatan: e.keterangan,
    })),
    ...partEvents.map((e) => ({
      source: 'PM_PART',
      label: `${e.part_name} (${e.drawing_no})`,
      tanggal: e.tgl_ganti,
      pic_name: e.pic_name,
      alasan_telat: e.alasan_telat,
      catatan: e.remark,
      counter: Number(e.counter_saat_diganti),
      target_shot: Number(e.target_shot),
    })),
  ].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));

  return {
    line_id: lineId,
    line_name: line.line_name,
    generated_at: new Date().toISOString(),
    late_now: byLine.get(lineId)?.items || [],
    idle: idle.is_idle
      ? { idle_days: idle.idle_days, last_run_date: idle.last_run_date, never_ran: idle.never_ran }
      : null,
    daily_output: fillDailyOutput(dailyRows, todayStr, OUTPUT_DAYS),
    recent_late_events: recentLateEvents,
  };
}

/**
 * Gabungkan PM telat Monthly/Weekly + Part jadi 1 daftar seragam (terbaru dulu). Fungsi murni.
 *  - Monthly/Weekly: lama telat = telat_hari yang dicatat saat submit (null untuk data lama).
 *  - Part: lama telat = counter_saat_diganti - target_shot (shot) + persen di atas target.
 */
function buildKetepatanLateEvents(lineEvents = [], partEvents = []) {
  // id = id baris history (pm_monthly_history / pm_part_history), dipakai UI untuk melengkapi alasan telat
  // lewat endpoint edit history yang sudah ada (PATCH /pm-line-history/:id, /pm-part-history/:id).
  const fromLine = lineEvents.map((e) => ({
    id: e.id,
    source: e.jenis_pm === 'WEEKLY' ? 'PM_LINE_WEEKLY' : 'PM_LINE_MONTHLY',
    label: e.jenis_pm === 'WEEKLY' ? 'PM Weekly' : 'PM Monthly',
    tanggal: e.tgl_input,
    late: e.telat_hari === null || e.telat_hari === undefined ? null : { unit: 'hari', value: Number(e.telat_hari) },
    pic_name: e.pic_name,
    alasan_telat: e.alasan_telat,
    catatan: e.keterangan,
  }));
  const fromPart = partEvents.map((e) => {
    const target = Number(e.target_shot);
    const over = Math.max(0, Number(e.counter_saat_diganti) - target);
    return {
      id: e.id,
      source: 'PM_PART',
      label: `${e.part_name} (${e.drawing_no})`,
      tanggal: e.tgl_ganti,
      late: { unit: 'shot', value: over, percent: target > 0 ? round1((over / target) * 100) : null },
      pic_name: e.pic_name,
      alasan_telat: e.alasan_telat,
      catatan: e.remark,
      counter: Number(e.counter_saat_diganti),
      target_shot: target,
    };
  });
  return [...fromLine, ...fromPart].sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0));
}

/**
 * Detail "Ketepatan PM < 100%" 1 Line: PM mana yang dinilai telat di periode itu, telat berapa lama,
 * siapa PIC-nya, dan alasannya. Periode & batas awal SAMA dengan perhitungan persentase ketepatan
 * (bulan/tahun berjalan, dipotong ketepatan_start_date) supaya angkanya cocok dengan daftarnya.
 */
async function getKetepatanLateDetail(lineId, period = 'month') {
  const safePeriod = period === 'year' ? 'year' : 'month';
  const lineRows = await lineIdleQueries.findLineActivity();
  const line = lineRows.find((r) => r.line_id === lineId);
  if (!line) throw AppError.notFound('Line tidak ditemukan');

  const periodFrom = safePeriod === 'month' ? dateUtils.startOfMonthString() : dateUtils.startOfYearString();
  const dateFrom = clampFrom(periodFrom, await settingsService.getSetting('ketepatan_start_date'));

  const [lineEvents, partEvents] = await Promise.all([
    pmLineHistoryQueries.findLateEvents({ lineId, dateFrom }),
    pmPartHistoryQueries.findLateEventsByLine({ lineId, dateFrom }),
  ]);

  return {
    line_id: lineId,
    line_name: line.line_name,
    period: safePeriod,
    date_from: dateFrom,
    events: buildKetepatanLateEvents(lineEvents, partEvents),
  };
}

module.exports = {
  getLateLines,
  getKetepatanLateDetail,
  buildKetepatanLateEvents,
  getLateLineEvidence,
  lateItemsFromLineStatus,
  lateItemFromPartMetric,
  fillDailyOutput,
};
