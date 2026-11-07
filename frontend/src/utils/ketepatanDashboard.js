// src/utils/ketepatanDashboard.js
//
// Helper murni untuk blok Ketepatan PM di Dashboard Management (bisa backdate): format persen, navigasi
// bulan 'YYYY-MM', skala + path chart 12 bulan, dan adapter data supaya data lokal (endpoint
// /dashboard/ketepatan) dan data site lain (snapshot /summary) bisa dirender komponen yang sama.
//
// Key bulan 'YYYY-MM' dioperasikan sebagai string/angka, TIDAK lewat Date, jadi tidak ada geser bulan
// karena timezone.

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

const pad2 = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM' -> 'November 2026' (long) / 'Nov 2026' (short) / 'Nov' (tanpa tahun). */
export function monthLabel(monthKey, style = 'long') {
  const [y, m] = String(monthKey).split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return String(monthKey);
  if (style === 'short') return `${MONTH_SHORT[m - 1]} ${y}`;
  if (style === 'name') return MONTH_SHORT[m - 1];
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Geser bulan: shiftMonth('2026-01', -1) -> '2025-12'. */
export function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

/** Batasi bulan pilihan: tidak boleh melewati bulan sekarang (belum ada event yang bisa dinilai). */
export function clampMonth(monthKey, currentMonth) {
  return monthKey > currentMonth ? currentMonth : monthKey;
}

/** 'YYYY-MM' valid (bulan 01-12). */
export function isMonthKey(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/**
 * Persen untuk ditampilkan. null/undefined = belum ada event -> '—' (BUKAN 0% / 100%). 94.44 -> '94.4%'.
 * Desimal pakai TITIK (konvensi dashboard ini, "97.9%"): useCountUp (KpiCard) memparse string "%" dengan
 * titik sebagai desimal, jadi jangan diganti locale id-ID.
 */
export function formatPct(value) {
  if (value === null || value === undefined) return '—';
  return `${Math.round(Number(value) * 10) / 10}%`;
}

/** Tone persentase: >=90 ok (accent), >=50 warn, selain itu danger; null = muted. */
export function pctTone(value) {
  if (value === null || value === undefined) return 'muted';
  if (value >= 90) return 'accent';
  if (value >= 50) return 'warn';
  return 'danger';
}

/** Caption kartu: jumlah event, atau alasan kenapa tidak ada angka. */
export function pctCaption({ percentage, total }, label, { beforeStart = false } = {}) {
  if (beforeStart) return 'Di luar periode hitung (sebelum tanggal mulai ketepatan)';
  if (percentage === null || percentage === undefined) return 'Belum ada event PM di periode ini';
  return `${label}, dari ${total} event`;
}

// ---------------------------------------------------------------------------------------------------------
// Chart 12 bulan

/** Kunci seri chart (urutan = urutan slot warna kategorikal; JANGAN diubah-ubah per filter). */
export const CHART_SERIES = [
  { key: 'part', label: 'PM Part', marker: 'circle' },
  { key: 'monthly', label: 'PM Monthly', marker: 'square' },
  { key: 'weekly', label: 'PM Weekly', marker: 'diamond' },
];

/**
 * by_month dari backend -> nilai per seri. Bulan di masa depan atau tanpa event = null (BOLONG di garis,
 * bukan 0%).
 * @returns {Array<{key:string,label:string,marker:string,values:(number|null)[]}>}
 */
export function buildChartSeries(byMonth) {
  return CHART_SERIES.map((s) => ({
    ...s,
    values: (byMonth ?? []).map((row) => (row.future || !row[s.key] || !row[s.key].total ? null : row[s.key].percentage)),
  }));
}

/**
 * Domain sumbu Y: selalu berakhir di 100 (target). Batas bawah menyesuaikan nilai terendah supaya variasi
 * 90-100% tidak jadi garis lurus rata di atas. Sumbu tetap jujur: ticks ditampilkan dengan angkanya.
 * @param {(number|null)[]} values
 * @returns {{min:number, max:number, ticks:number[]}}
 */
export function niceDomain(values) {
  const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0) return { min: 0, max: 100, ticks: [0, 50, 100] };
  let min = Math.max(0, Math.floor((Math.min(...nums) - 5) / 10) * 10);
  min = Math.min(min, 90);
  if (100 - min > 50) min = Math.floor(min / 20) * 20;
  const range = 100 - min;
  const step = range <= 10 ? 5 : range <= 50 ? 10 : 20;
  const ticks = [];
  for (let t = min; t <= 100; t += step) ticks.push(t);
  return { min, max: 100, ticks };
}

/**
 * Path SVG satu seri; titik null MEMUTUS garis (segmen baru), jadi bulan tanpa data terlihat bolong.
 * @param {(number|null)[]} values
 * @param {(i:number)=>number} xOf
 * @param {(v:number)=>number} yOf
 * @returns {string} atribut d ('' kalau tidak ada titik)
 */
export function linePath(values, xOf, yOf) {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v === null || v === undefined) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${round(xOf(i))} ${round(yOf(v))} `;
    pen = true;
  });
  return d.trim();
}

function round(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Sebar posisi Y label langsung supaya tidak bertumpuk (mis. 3 seri sama-sama 100%). Urutan vertikal
 * dipertahankan, jarak antar label >= minGap, hasil dijepit ke [lo, hi]. Nilai null tetap null.
 * @param {(number|null)[]} ys posisi ideal tiap label (urutan seri)
 */
export function spreadLabels(ys, minGap, lo = -Infinity, hi = Infinity) {
  const items = ys.map((y, i) => ({ y, i })).filter((o) => o.y !== null && o.y !== undefined).sort((a, b) => a.y - b.y || a.i - b.i);
  const forward = () => {
    for (let k = 1; k < items.length; k += 1) items[k].y = Math.max(items[k].y, items[k - 1].y + minGap);
  };
  const backward = () => {
    for (let k = items.length - 2; k >= 0; k -= 1) items[k].y = Math.min(items[k].y, items[k + 1].y - minGap);
  };
  if (items.length > 0) items[0].y = Math.max(items[0].y, lo);
  forward();
  if (items.length > 0 && items[items.length - 1].y > hi) {
    items[items.length - 1].y = hi;
    backward();
  }
  const out = ys.map(() => null);
  items.forEach((o) => { out[o.i] = o.y; });
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// Adapter data

const EMPTY_CELL = { percentage: null, total: 0, on_time_count: 0 };
const cell = (c) => (c ? { percentage: c.percentage ?? null, total: c.total ?? 0, on_time_count: c.on_time_count ?? 0 } : { ...EMPTY_CELL });

/**
 * Data lokal (GET /dashboard/ketepatan) -> bentuk tampilan.
 * `hasPart` & `byMonth` ada karena data lokal lengkap; data site lain tidak punya keduanya.
 */
export function viewFromLocal(data) {
  return {
    source: 'local',
    month: data.month,
    year: data.year,
    isCurrent: data.is_current,
    currentMonth: data.current_month,
    bulan: { beforeStart: data.bulan.before_start, part: cell(data.bulan.part), monthly: cell(data.bulan.monthly), weekly: cell(data.bulan.weekly) },
    tahun: { beforeStart: data.tahun.before_start, part: cell(data.tahun.part), monthly: cell(data.tahun.monthly), weekly: cell(data.tahun.weekly) },
    byMonth: data.by_month,
    trend: data.trend.map((r) => ({ month: r.month, part: cell(r.part), monthly: cell(r.monthly), weekly: cell(r.weekly) })),
    belowTarget: { bulan: data.below_target.bulan, tahun: data.below_target.tahun },
  };
}

/**
 * Snapshot site lain (summary + ketepatan_attention) -> bentuk tampilan yang sama. Site lain hanya
 * menyediakan angka bulan berjalan/tahun berjalan: tidak ada backdate, chart 12 bulan, maupun PM Part
 * per bulan, jadi bagian itu null dan komponen menyembunyikannya.
 */
export function viewFromRemote(summary, ketepatanAttention = []) {
  if (!summary) return null;
  const bulan = summary.ketepatan_bulan_ini;
  return {
    source: 'remote',
    month: bulan?.month ?? null,
    year: null,
    isCurrent: true,
    currentMonth: bulan?.month ?? null,
    bulan: bulan ? { beforeStart: false, part: null, monthly: cell(bulan.monthly), weekly: cell(bulan.weekly) } : null,
    tahun: {
      beforeStart: false,
      part: cell({ percentage: summary.ketepatan_pm_part_percentage, total: summary.ketepatan_pm_part_total }),
      monthly: cell({ percentage: summary.ketepatan_pm_monthly_percentage, total: summary.ketepatan_pm_monthly_total }),
      weekly: cell({ percentage: summary.ketepatan_pm_weekly_percentage, total: summary.ketepatan_pm_weekly_total }),
    },
    byMonth: null,
    trend: (summary.ketepatan_trend ?? []).map((r) => ({ month: r.month, part: null, monthly: cell(r.monthly), weekly: cell(r.weekly) })),
    belowTarget: { bulan: null, tahun: ketepatanAttention },
  };
}

/** Baris "Line < 100%" yang layak tampil (worst_percentage ada dan < 100). */
export function belowTargetRows(items) {
  return (items ?? []).filter((r) => r.worst_percentage !== null && r.worst_percentage !== undefined && r.worst_percentage < 100);
}
