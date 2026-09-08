// src/mocks/dashboardSeed.js
//
// Dummy data generator buat Dashboard Management - DEV ONLY.
// Tujuannya biar lu bisa lihat dashboard dalam kondisi "penuh" sebelum
// mutusin poles UI (density/typography/radius), bukan dinilai pas semua 0.
//
// PRINSIP (sengaja niru pola data asli, bukan placeholder ngasal):
// 1. Semua angka summary (KPI + donut) DITURUNKAN dari underlying `lines`
//    & `parts` yang sama - jadi internally consistent. Donut bilang "3
//    kritis" => di attention & tabel emang ada 3 yang kritis, bukan angka
//    acak yang nabrak.
// 2. Shape output PERSIS sama kayak yang dikonsumsi DashboardPage.jsx:
//    - summary: { total_parts, status_ok, status_warning, status_danger,
//        active_lines, lines_healthy, lines_warning, lines_critical,
//        ketepatan_pm_part_percentage, ketepatan_pm_part_total, ...monthly,
//        ...weekly }
//    - attention: [{ part_id, line_name, part_name, status, remaining_shot,
//        wear_percentage }]
//    - upcoming: [{ line_name, estimated_date, label, status }]
//    - ketepatan_attention: [{ line_id, line_name, part_percentage,
//        monthly_percentage, weekly_percentage }]
// 3. Deterministik (seeded PRNG) - refresh berkali-kali angkanya tetap sama,
//    biar lu bisa bandingin screenshot before/after poles tanpa data loncat.
//    Ganti SEED di bawah kalau mau variasi lain.

const SEED = 20260908;

// PRNG kecil (mulberry32) - deterministik, cukup buat dummy.
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(SEED);
const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

// --- Master: nama line & part gaya molding (biar kerasa domain Hirose) ---
const LINE_NAMES = [
  'INJ-01', 'INJ-02', 'INJ-03', 'INJ-04', 'INJ-05', 'INJ-06',
  'INJ-07', 'INJ-08', 'INJ-09', 'INJ-10', 'INJ-11', 'INJ-12',
];

const PART_NAMES = [
  'Ejector Pin', 'Core Pin', 'Sprue Bush', 'Guide Pin', 'Slide Core',
  'Cavity Insert', 'Runner Lock', 'Return Pin', 'Angular Pin', 'Wear Plate',
];

// Bikin daftar line dengan status yang terdistribusi realistis:
// mayoritas sehat, sebagian perlu perhatian, sedikit kritis.
function buildLines() {
  return LINE_NAMES.map((name, i) => {
    const roll = rng();
    let status;
    if (roll < 0.62) status = 'HEALTHY';
    else if (roll < 0.85) status = 'WARNING';
    else status = 'CRITICAL';

    // Ketepatan PM per-line (%). Line kritis cenderung ketepatannya rendah.
    const base = status === 'CRITICAL' ? randInt(28, 55)
      : status === 'WARNING' ? randInt(55, 82)
        : randInt(82, 99);

    return {
      line_id: i + 1,
      line_name: name,
      status,
      part_percentage: Math.min(100, base + randInt(-6, 6)),
      monthly_percentage: Math.min(100, base + randInt(-8, 8)),
      weekly_percentage: Math.min(100, base + randInt(-10, 10)),
    };
  });
}

// Bikin parts per line dengan wear%. Wear tinggi => remaining shot dikit
// => status DANGER/WARNING (dipakai buat KPI part & Critical Alerts).
function buildParts(lines) {
  const parts = [];
  let pid = 1;
  for (const line of lines) {
    const count = randInt(4, 8); // tiap line punya beberapa part kritikal
    for (let j = 0; j < count; j++) {
      // Line yang lebih "sakit" cenderung punya part wear tinggi.
      const skew = line.status === 'CRITICAL' ? 30 : line.status === 'WARNING' ? 12 : 0;
      const wear = Math.min(99, randInt(20, 70) + skew);

      let status = 'OK';
      if (wear >= 90) status = 'DANGER';
      else if (wear >= 75) status = 'WARNING';

      const lifespan = randInt(80000, 250000);
      const remaining = Math.max(0, Math.round(lifespan * (1 - wear / 100)));

      parts.push({
        part_id: pid++,
        line_id: line.line_id,
        line_name: line.line_name,
        part_name: pick(PART_NAMES),
        wear_percentage: wear,
        remaining_shot: remaining,
        status,
      });
    }
  }
  return parts;
}

// Weighted average ketepatan across lines (yang punya event).
function avgPct(lines, key) {
  const vals = lines.map((l) => l[key]).filter((v) => v !== null && v !== undefined);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function buildSummary(lines, parts) {
  const lines_healthy = lines.filter((l) => l.status === 'HEALTHY').length;
  const lines_warning = lines.filter((l) => l.status === 'WARNING').length;
  const lines_critical = lines.filter((l) => l.status === 'CRITICAL').length;

  const status_ok = parts.filter((p) => p.status === 'OK').length;
  const status_warning = parts.filter((p) => p.status === 'WARNING').length;
  const status_danger = parts.filter((p) => p.status === 'DANGER').length;

  return {
    total_parts: parts.length,
    status_ok,
    status_warning,
    status_danger,

    active_lines: lines.length,
    lines_healthy,
    lines_warning,
    lines_critical,

    ketepatan_pm_part_percentage: avgPct(lines, 'part_percentage'),
    ketepatan_pm_part_total: parts.length,
    ketepatan_pm_monthly_percentage: avgPct(lines, 'monthly_percentage'),
    ketepatan_pm_monthly_total: lines.length * randInt(3, 5),
    ketepatan_pm_weekly_percentage: avgPct(lines, 'weekly_percentage'),
    ketepatan_pm_weekly_total: lines.length * randInt(8, 14),
  };
}

// Critical Alerts: part paling parah (DANGER dulu, lalu WARNING), top 6.
function buildAttention(parts) {
  return parts
    .filter((p) => p.status === 'DANGER' || p.status === 'WARNING')
    .sort((a, b) => b.wear_percentage - a.wear_percentage)
    .slice(0, 6)
    .map((p) => ({
      part_id: p.part_id,
      line_name: p.line_name,
      part_name: p.part_name,
      status: p.status,
      remaining_shot: p.remaining_shot,
      wear_percentage: p.wear_percentage,
    }));
}

// Upcoming PM 7 hari ke depan: sebar penggantian part ke beberapa hari.
function buildUpcoming(parts) {
  const soon = parts
    .filter((p) => p.status !== 'OK')
    .sort((a, b) => a.remaining_shot - b.remaining_shot)
    .slice(0, 10);

  const today = new Date();
  return soon.map((p) => {
    const dayOffset = randInt(0, 7);
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    const estimated_date = d.toISOString().slice(0, 10); // YYYY-MM-DD
    return {
      line_name: p.line_name,
      estimated_date,
      label: `Ganti ${p.part_name}`,
      status: p.status,
    };
  });
}

// Ranking ketepatan terendah (5 line paling rendah).
function buildKetepatanAttention(lines) {
  return [...lines]
    .sort((a, b) => a.part_percentage - b.part_percentage)
    .slice(0, 5)
    .map((l) => ({
      line_id: l.line_id,
      line_name: l.line_name,
      part_percentage: l.part_percentage,
      monthly_percentage: l.monthly_percentage,
      weekly_percentage: l.weekly_percentage,
    }));
}

// --- Build sekali, export hasilnya ---
const _lines = buildLines();
const _parts = buildParts(_lines);

export const dashboardSeed = {
  summary: buildSummary(_lines, _parts),
  attention: buildAttention(_parts),
  upcoming: buildUpcoming(_parts),
  ketepatan_attention: buildKetepatanAttention(_lines),
};

// Kalau mau versi KOSONG (buat balik nge-test empty state), pakai ini:
export const dashboardSeedEmpty = {
  summary: {
    total_parts: 0, status_ok: 0, status_warning: 0, status_danger: 0,
    active_lines: 0, lines_healthy: 0, lines_warning: 0, lines_critical: 0,
    ketepatan_pm_part_percentage: null, ketepatan_pm_part_total: 0,
    ketepatan_pm_monthly_percentage: null, ketepatan_pm_monthly_total: 0,
    ketepatan_pm_weekly_percentage: null, ketepatan_pm_weekly_total: 0,
  },
  attention: [],
  upcoming: [],
  ketepatan_attention: [],
};

export default dashboardSeed;
