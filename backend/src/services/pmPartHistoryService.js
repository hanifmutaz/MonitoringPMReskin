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
const inventoryService = require('./inventoryService');
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

// Efek "kurangin stock inventory" (fitur scan barcode Drawing No dari iPad,
// lihat permission pm_part.submit) DISENGAJA cuma jalan kalau Part-nya
// SUDAH di-link ke Inventory Item (parts.inventory_item_id NOT NULL).
// Kalau belum di-link, submit TETAP boleh jalan (riwayat PM tetap penting
// dicatat walau stock belum ke-setup) - cuma stock-nya gak berkurang,
// ditandain di response lewat `stock` supaya frontend bisa kasih notice ke
// operator, BUKAN silent (biar ketauan part ini perlu di-link nanti).
// 1 penggantian part = 1 unit terpakai dari stock (qty selalu 1, bukan
// dari input form - operator gak input qty di form PM Part).
async function applyStockDeduction(part, historyId, userId, client) {
  if (!part.inventory_item_id) {
    return { deducted: false, reason: 'NOT_LINKED' };
  }

  const updatedItem = await inventoryService.adjustStock(
    part.inventory_item_id,
    {
      movement_type: 'STOCK_OUT',
      qty: 1,
      note: `Auto: penggantian PM Part (Drawing No ${part.drawing_no})`,
    },
    userId,
    { refType: 'pm_part_history', refId: historyId, runner: client }
  );

  return { deducted: true, current_stock: updatedItem.current_stock };
}

async function createHistory(data, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const part = await pmPartHistoryQueries.findPartForHistory(data.part_id, client);
    if (part === null) {
      throw AppError.badRequest('Validasi gagal', { part_id: 'Part tidak ditemukan' });
    }

    const onTime = determineOnTime(data.jenis_penggantian, data.counter_saat_diganti, part.target_shot);
    const created = await pmPartHistoryQueries.create({ ...data, user_id: userId, on_time: onTime }, client);

    const stock = await applyStockDeduction(part, created.id, userId, client);

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
    return { ...created, stock };
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
