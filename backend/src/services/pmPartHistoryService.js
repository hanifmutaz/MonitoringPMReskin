// src/services/pmPartHistoryService.js
//
// Efek "update tgl_pasang_terakhir pada parts terkait" (03_API_SPECIFICATION.md
// §7) TIDAK butuh UPDATE eksplisit ke kolom `parts` — karena skema final
// (04_DATABASE_SCHEMA.sql + query kunci Master Document Bagian 3) menghitung
// "Tgl Pasang Terakhir" secara live lewat MAX(tgl_ganti) dari pm_part_history,
// bukan kolom cache terpisah. Insert row baru ke pm_part_history SUDAH CUKUP
// untuk membuat efek itu terjadi otomatis di query PM Part berikutnya.

const db = require('../config/db');
const pmPartHistoryQueries = require('../sql/pmPartHistoryQueries');
const { recordAudit } = require('../utils/auditLog');
const dateUtils = require('../utils/dateUtils');
const AppError = require('../utils/AppError');

async function listHistory({ lineId, partId, jenis, dateFrom, dateTo, page, limit }) {
  const pageNum = Number(page) > 0 ? Number(page) : 1;
  const limitNum = Number(limit) > 0 ? Number(limit) : 20;
  return pmPartHistoryQueries.findAll({ lineId, partId, jenis, dateFrom, dateTo, page: pageNum, limit: limitNum });
}

/**
 * Fungsi MURNI (tanpa DB) yang nentuin ketepatan PM Part, dipisah dari
 * createHistory() supaya bisa di-unit-test langsung (sama pola dengan
 * determineHelperUpdate() di pmLineHistoryService.js).
 *
 * BROKEN sengaja dikecualikan (null) - part gagal duluan di luar jadwal
 * itu soal reliabilitas part, bukan soal ketepatan operator menjalankan PM.
 *
 * @param {'BROKEN'|'PM_EARLY'|'TERJADWAL'} jenisPenggantian
 * @param {number} counterSaatDiganti
 * @param {number} targetShot
 * @returns {boolean|null}
 */
function determineOnTime(jenisPenggantian, counterSaatDiganti, targetShot) {
  if (jenisPenggantian === 'BROKEN') return null;
  return Number(counterSaatDiganti) <= Number(targetShot);
}

async function createHistory(data, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const targetShot = await pmPartHistoryQueries.findPartTargetShot(data.part_id, client);
    if (targetShot === null) {
      throw AppError.badRequest('Validasi gagal', { part_id: 'Part tidak ditemukan' });
    }

    const onTime = determineOnTime(data.jenis_penggantian, data.counter_saat_diganti, targetShot);
    const created = await pmPartHistoryQueries.create({ ...data, user_id: userId, on_time: onTime }, client);

    await recordAudit(
      {
        tableName: 'pm_part_history',
        recordId: created.id,
        action: 'CREATE',
        oldValue: null,
        newValue: created,
        userId,
      },
      client
    );

    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function toPercentage(total, onTimeCount) {
  if (!total) return null; // belum ada data yang bisa dihitung tahun ini
  return Math.round((onTimeCount / total) * 1000) / 10; // 1 desimal
}

// --- Ketepatan PM Part, tahun berjalan (lihat migration 1700000012000) ---

async function getKetepatanSummary() {
  const dateFrom = dateUtils.startOfYearString();
  const row = await pmPartHistoryQueries.getKetepatanOverall({ dateFrom });
  const total = Number(row.total);
  const onTimeCount = Number(row.on_time_count);
  return { total, on_time_count: onTimeCount, percentage: toPercentage(total, onTimeCount) };
}

async function getKetepatanPerLine() {
  const dateFrom = dateUtils.startOfYearString();
  const rows = await pmPartHistoryQueries.getKetepatanPerLine({ dateFrom });
  return rows.map((r) => {
    const total = Number(r.total);
    const onTimeCount = Number(r.on_time_count);
    return {
      line_id: r.line_id,
      line_name: r.line_name,
      total,
      on_time_count: onTimeCount,
      percentage: toPercentage(total, onTimeCount),
    };
  });
}

module.exports = {
  listHistory,
  createHistory,
  determineOnTime,
  getKetepatanSummary,
  getKetepatanPerLine,
};
