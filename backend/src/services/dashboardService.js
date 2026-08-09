const dashboardQueries = require('../sql/dashboardQueries');
const pmPartService = require('./pmPartService');
const pmLineService = require('./pmLineService');
const pmPartHistoryService = require('./pmPartHistoryService');
const pmLineHistoryService = require('./pmLineHistoryService');
const settingsService = require('./settingsService');
const dateUtils = require('../utils/dateUtils');

const DASHBOARD_CACHE_TTL_MS = 5000;
const cache = new Map();

function getCached(key, computeFn) {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expiresAt > now) {
    return entry.promise;
  }

  const promise = computeFn();
  cache.set(key, { promise, expiresAt: now + DASHBOARD_CACHE_TTL_MS });
  promise.catch(() => cache.delete(key));
  return promise;
}

function getCachedPartMetrics() {
  return getCached('partMetrics', () => pmPartService.getAllComputedMetrics());
}

function getCachedLineStatuses() {
  return getCached('lineStatuses', () => pmLineService.getPmLineStatus({}));
}

const STATUS_RANK = { OK: 0, WARNING: 1, DANGER: 2 };

function worstStatus(a, b) {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

async function getSummary() {
  const [partMetrics, lineStatuses, totalParts, activeLines, ketepatanPart, ketepatanLine] = await Promise.all([
    getCachedPartMetrics(),
    getCachedLineStatuses(),
    dashboardQueries.countAllParts(),
    dashboardQueries.countActiveLines(),
    // Ketepatan PM (tahun berjalan, lihat migration 1700000012000) - angka
    // akumulasi ringkas buat Dashboard, breakdown per-Line-nya sendiri ada
    // di halaman Monitoring (pmLineService.getPmLineStatus / pmPartService.getKetepatanPerLine).
    pmPartHistoryService.getKetepatanSummary(),
    pmLineHistoryService.getKetepatanSummary(),
  ]);

  const statusCounts = { OK: 0, WARNING: 0, DANGER: 0 };
  for (const p of partMetrics) statusCounts[p.status] += 1;

  const lineBuckets = { OK: 0, WARNING: 0, DANGER: 0 };
  for (const l of lineStatuses) {
    const worst = worstStatus(l.status_monthly, l.status_weekly);
    lineBuckets[worst] += 1;
  }

  return {
    total_parts: totalParts,
    status_ok: statusCounts.OK,
    status_warning: statusCounts.WARNING,
    status_danger: statusCounts.DANGER,
    active_lines: activeLines,
    lines_healthy: lineBuckets.OK,
    lines_warning: lineBuckets.WARNING,
    lines_critical: lineBuckets.DANGER,
    ketepatan_pm_part_percentage: ketepatanPart.percentage,
    ketepatan_pm_part_total: ketepatanPart.total,
    ketepatan_pm_monthly_percentage: ketepatanLine.monthly.percentage,
    ketepatan_pm_monthly_total: ketepatanLine.monthly.total,
    ketepatan_pm_weekly_percentage: ketepatanLine.weekly.percentage,
    ketepatan_pm_weekly_total: ketepatanLine.weekly.total,
  };
}

async function getAttention() {
  const limit = (await settingsService.getSetting('dashboard_upcoming_pm_limit')) || 10;
  const partMetrics = await getCachedPartMetrics();

  return partMetrics
    .filter((p) => p.status === 'WARNING' || p.status === 'DANGER')
    .sort((a, b) => a.remaining_shot - b.remaining_shot)
    .slice(0, limit);
}

const UPCOMING_WINDOW_DAYS = 7; // sesuai 05_UI_UX_SPECIFICATION.md §4.5 (Gantt Timeline 7 hari ke depan)

function withinUpcomingWindow(dateStr) {
  if (!dateStr) return false;
  const todayStr = dateUtils.todayString();
  const windowEndStr = dateUtils.addDaysToToday(UPCOMING_WINDOW_DAYS);
  return dateStr >= todayStr && dateStr <= windowEndStr;
}

async function getUpcoming() {
  const [partMetrics, lineStatuses] = await Promise.all([
    getCachedPartMetrics(),
    getCachedLineStatuses(),
  ]);

  const items = [];

  for (const p of partMetrics) {
    if (withinUpcomingWindow(p.estimated_pm_date)) {
      items.push({
        type: 'PM_PART',
        line_name: p.line_name,
        label: p.part_name,
        estimated_date: p.estimated_pm_date,
        status: p.status,
      });
    }
  }

  for (const l of lineStatuses) {
    if (l.sisa_hari_monthly !== null) {
      const estDate = dateUtils.addDaysToToday(Math.max(l.sisa_hari_monthly, 0));
      if (withinUpcomingWindow(estDate)) {
        items.push({
          type: 'PM_LINE_MONTHLY',
          line_name: l.line_name,
          label: 'PM Monthly',
          estimated_date: estDate,
          status: l.status_monthly,
        });
      }
    }
    if (l.sisa_hari_weekly !== null) {
      const estDate = dateUtils.addDaysToToday(Math.max(l.sisa_hari_weekly, 0));
      if (withinUpcomingWindow(estDate)) {
        items.push({
          type: 'PM_LINE_WEEKLY',
          line_name: l.line_name,
          label: 'PM Weekly',
          estimated_date: estDate,
          status: l.status_weekly,
        });
      }
    }
  }

  items.sort((a, b) => (a.estimated_date > b.estimated_date ? 1 : -1));
  return items;
}

async function getSyncStatus() {
  const row = await dashboardQueries.getLastSyncInfo();
  if (!row || !row.last_synced_at) {
    return { last_synced_at: null, status: 'fail', rows_synced: 0 };
  }
  return {
    last_synced_at: row.last_synced_at,
    status: 'success',
    rows_synced: row.rows_synced || 0,
  };
}

// Ranking Line dengan ketepatan PM paling rendah tahun ini (gabungan Part +
// Monthly + Weekly, ambil nilai TERBURUK per Line) - buat manager langsung
// tau Line mana yang perlu ditegur/dibantu tanpa harus buka 2 halaman
// Monitoring terpisah dan bandingin manual satu-satu.
const KETEPATAN_ATTENTION_LIMIT = 5;

async function getKetepatanAttention() {
  const [partPerLine, linePerLine] = await Promise.all([
    pmPartHistoryService.getKetepatanPerLine(),
    pmLineHistoryService.getKetepatanPerLine(),
  ]);

  const merged = new Map();
  const upsert = (lineId, lineName) => {
    if (!merged.has(lineId)) {
      merged.set(lineId, {
        line_id: lineId,
        line_name: lineName,
        part_percentage: null,
        monthly_percentage: null,
        weekly_percentage: null,
      });
    }
    return merged.get(lineId);
  };

  for (const p of partPerLine) {
    upsert(p.line_id, p.line_name).part_percentage = p.percentage;
  }
  for (const l of linePerLine) {
    const row = upsert(l.line_id, l.line_name);
    row.monthly_percentage = l.monthly.percentage;
    row.weekly_percentage = l.weekly.percentage;
  }

  return Array.from(merged.values())
    .map((row) => {
      const values = [row.part_percentage, row.monthly_percentage, row.weekly_percentage].filter(
        (v) => v !== null && v !== undefined
      );
      return { ...row, worst_percentage: values.length ? Math.min(...values) : null };
    })
    .filter((row) => row.worst_percentage !== null)
    .sort((a, b) => a.worst_percentage - b.worst_percentage)
    .slice(0, KETEPATAN_ATTENTION_LIMIT);
}

// --- Dashboard khusus per domain (dipisah dari getSummary/getAttention yang
// nyampur Part + Line, buat halaman "Dashboard PM Part" & "Dashboard PM
// Monthly and Weekly" yang masing-masing cuma nampilin domainnya sendiri) ---

async function getPartSummary() {
  const partMetrics = await getCachedPartMetrics();

  const statusCounts = { OK: 0, WARNING: 0, DANGER: 0 };
  for (const p of partMetrics) statusCounts[p.status] += 1;

  const perLine = {};
  for (const p of partMetrics) {
    if (!perLine[p.line_name]) perLine[p.line_name] = { line_name: p.line_name, OK: 0, WARNING: 0, DANGER: 0 };
    perLine[p.line_name][p.status] += 1;
  }

  const topAttention = partMetrics
    .filter((p) => p.status === 'WARNING' || p.status === 'DANGER')
    .sort((a, b) => a.remaining_shot - b.remaining_shot)
    .slice(0, 10);

  return {
    total_parts: partMetrics.length,
    status_ok: statusCounts.OK,
    status_warning: statusCounts.WARNING,
    status_danger: statusCounts.DANGER,
    per_line: Object.values(perLine).sort((a, b) => b.DANGER - a.DANGER || b.WARNING - a.WARNING),
    top_attention: topAttention,
  };
}

async function getLineSummary() {
  const lineStatuses = await getCachedLineStatuses();

  const monthlyBuckets = { OK: 0, WARNING: 0, DANGER: 0 };
  const weeklyBuckets = { OK: 0, WARNING: 0, DANGER: 0 };
  for (const l of lineStatuses) {
    monthlyBuckets[l.status_monthly] += 1;
    weeklyBuckets[l.status_weekly] += 1;
  }

  const attention = lineStatuses
    .filter((l) => l.status_monthly !== 'OK' || l.status_weekly !== 'OK')
    .sort((a, b) => worstStatus(b.status_monthly, b.status_weekly) === 'DANGER' ? 1 : -1);

  return {
    total_lines: lineStatuses.length,
    monthly: monthlyBuckets,
    weekly: weeklyBuckets,
    attention,
  };
}

module.exports = {
  getSummary,
  getAttention,
  getUpcoming,
  getSyncStatus,
  getPartSummary,
  getLineSummary,
  getKetepatanAttention,
};