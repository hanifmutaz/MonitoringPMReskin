// src/sql/conmasQueries.js
//
// Query ke tabel ConMas `view_report_25415`. Mapping field PERSIS
// dikonfirmasi oleh pemilik project (18 Jul 2026) — JANGAN diubah tanpa
// konfirmasi ulang, ini bukan tebakan:
//
//   cluster_1_17_t = Line
//   cluster_1_44_d = Tanggal
//   Slot 1-6 (1 shift bisa multi-CL kalau ganti model di tengah shift):
//     CL No           : cluster_1_{7,20,33,45,57,69}_t
//     Product Name    : cluster_1_{8,21,34,46,58,70}_t
//     Output Actual   : cluster_1_{2784,2807,2830,2853,2876,2899}_n
//     Reject F027     : cluster_1_{2785,2808,2831,2854,2877,2900}_n
//     Reject F028     : cluster_1_{2786,2809,2832,2855,2878,2901}_n
//     Reject M107     : cluster_1_{2787,2810,2833,2856,2879,2902}_n
//
// 1 baris di view ini = 1 shift entry (nama laporan mengandung "Shift N").
// Karena itu, "berapa kali Line running per hari" = COUNT(DISTINCT baris)
// per Line+tanggal yang punya output > 0 di slot manapun — INI yang
// menyelesaikan blocker PM Monthly accrual (lihat pmMonthlyAccrualService.js).

const conmasDb = require('../config/conmasDb');

const SOURCE_TABLE = 'view_report_25415';

const SLOTS = [
  { cl: 'cluster_1_7_t', output: 'cluster_1_2784_n', rejF027: 'cluster_1_2785_n', rejF028: 'cluster_1_2786_n', rejM107: 'cluster_1_2787_n' },
  { cl: 'cluster_1_20_t', output: 'cluster_1_2807_n', rejF027: 'cluster_1_2808_n', rejF028: 'cluster_1_2809_n', rejM107: 'cluster_1_2810_n' },
  { cl: 'cluster_1_33_t', output: 'cluster_1_2830_n', rejF027: 'cluster_1_2831_n', rejF028: 'cluster_1_2832_n', rejM107: 'cluster_1_2833_n' },
  { cl: 'cluster_1_45_t', output: 'cluster_1_2853_n', rejF027: 'cluster_1_2854_n', rejF028: 'cluster_1_2855_n', rejM107: 'cluster_1_2856_n' },
  { cl: 'cluster_1_57_t', output: 'cluster_1_2876_n', rejF027: 'cluster_1_2877_n', rejF028: 'cluster_1_2878_n', rejM107: 'cluster_1_2879_n' },
  { cl: 'cluster_1_69_t', output: 'cluster_1_2899_n', rejF027: 'cluster_1_2900_n', rejF028: 'cluster_1_2901_n', rejM107: 'cluster_1_2902_n' },
];

/**
 * Unpivot 6 slot CL per baris jadi 1 baris per (line, tanggal, cl_no),
 * dengan output_actual (good) DAN breakdown reject terpisah (F027/F028/M107)
 * — penggabungan reject ke shot count dilakukan di Service layer sesuai
 * setting `pm_part_counter_include_reject` (business logic, bukan di SQL).
 */
async function fetchProductionData(lookbackDays) {
  const unionParts = SLOTS.map(
    (slot) => `
    SELECT
      TRIM(cluster_1_17_t) AS line_code,
      cluster_1_44_d::date AS tanggal,
      TRIM(${slot.cl}) AS cl_no,
      COALESCE(${slot.output}, 0) AS output_actual,
      COALESCE(${slot.rejF027}, 0) AS reject_f027,
      COALESCE(${slot.rejF028}, 0) AS reject_f028,
      COALESCE(${slot.rejM107}, 0) AS reject_m107
    FROM ${SOURCE_TABLE}
    WHERE ${slot.cl} IS NOT NULL AND TRIM(${slot.cl}) <> ''
      AND cluster_1_44_d >= CURRENT_DATE - $1::int
    `
  );

  const query = `SELECT * FROM (${unionParts.join(' UNION ALL ')}) unpivoted ORDER BY tanggal`;
  const result = await conmasDb.query(query, [lookbackDays]);
  return result.rows;
}

/**
 * Hitung "berapa kali Line running per hari" = jumlah shift entry (baris)
 * per Line+tanggal yang punya output > 0 di slot manapun. Dipakai buat
 * akumulasi poin PM Monthly (MASTER DOCUMENT Bagian 2.B).
 */
async function fetchDailyRunCounts(lookbackDays) {
  const outputChecks = SLOTS.map((slot) => `COALESCE(${slot.output}, 0) > 0`).join(' OR ');

  const query = `
    SELECT
      TRIM(cluster_1_17_t) AS line_code,
      cluster_1_44_d::date AS tanggal,
      COUNT(*) AS run_count
    FROM ${SOURCE_TABLE}
    WHERE cluster_1_44_d >= CURRENT_DATE - $1::int
      AND (${outputChecks})
    GROUP BY TRIM(cluster_1_17_t), cluster_1_44_d::date
  `;

  const result = await conmasDb.query(query, [lookbackDays]);
  return result.rows;
}

module.exports = { fetchProductionData, fetchDailyRunCounts };
