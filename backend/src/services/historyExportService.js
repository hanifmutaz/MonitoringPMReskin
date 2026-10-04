// src/services/historyExportService.js
// Export riwayat (PM Part, PM Monthly/Weekly, mutasi Inventory) ke .xlsx.
// Filter-nya SAMA dengan endpoint list (line_id, jenis, date_from, date_to ...),
// jadi yang diexport = persis yang sedang difilter di layar, tapi SEMUA halaman
// (bukan cuma 20 baris halaman aktif).
const pmPartHistoryQueries = require('../sql/pmPartHistoryQueries');
const pmLineHistoryQueries = require('../sql/pmLineHistoryQueries');
const inventoryQueries = require('../sql/inventoryQueries');
const auditLogQueries = require('../sql/auditLogQueries');
const pmPartService = require('./pmPartService');
const dateUtils = require('../utils/dateUtils');
const {
  EXPORT_MAX_ROWS,
  buildXlsxBuffer,
  exportFilename,
  formatTimestampWib,
  onTimeLabel,
  assertWithinExportLimit,
} = require('../utils/xlsxExport');

const PM_LINE_JENIS_LABEL = { MONTHLY: 'Monthly', WEEKLY: 'Weekly' };
const MOVEMENT_TYPE_LABEL = { STOCK_IN: 'Stock In', STOCK_OUT: 'Stock Out', ADJUSTMENT: 'Adjustment' };

// maxRows = cap + 1: kalau yang kembali > cap berarti datanya kelebihan.
const FETCH_LIMIT = EXPORT_MAX_ROWS + 1;

async function exportPmPartHistory(filters) {
  const rows = assertWithinExportLimit(await pmPartHistoryQueries.findAllForExport({ ...filters, maxRows: FETCH_LIMIT }));
  const buffer = buildXlsxBuffer({
    sheetName: 'History PM Part',
    rows,
    columns: [
      { header: 'Tanggal Ganti', width: 14, value: (r) => r.tgl_ganti },
      { header: 'Line', width: 14, value: (r) => r.line_name },
      { header: 'Jig', width: 16, value: (r) => r.jig_name },
      { header: 'Drawing No (IPDP)', width: 20, value: (r) => r.drawing_no },
      { header: 'Part Name', width: 28, value: (r) => r.part_name },
      { header: 'Shift', width: 8, value: (r) => r.shift },
      { header: 'Counter Saat Diganti', width: 20, value: (r) => (r.counter_saat_diganti === null ? '' : Number(r.counter_saat_diganti)) },
      { header: 'Jenis Penggantian', width: 20, value: (r) => r.jenis_label },
      { header: 'PIC', width: 18, value: (r) => r.pic_name },
      { header: 'Ketepatan', width: 14, value: (r) => onTimeLabel(r.on_time) },
      { header: 'Remark', width: 32, value: (r) => r.remark },
      { header: 'Diinput Oleh', width: 20, value: (r) => r.user_full_name },
      { header: 'Waktu Input (WIB)', width: 18, value: (r) => formatTimestampWib(r.created_at) },
    ],
  });
  return { buffer, filename: exportFilename('history-pm-part') };
}

async function exportPmLineHistory(filters) {
  const rows = assertWithinExportLimit(await pmLineHistoryQueries.findAllForExport({ ...filters, maxRows: FETCH_LIMIT }));
  const buffer = buildXlsxBuffer({
    sheetName: 'History PM Line',
    rows,
    columns: [
      { header: 'Tanggal', width: 14, value: (r) => r.tgl_input },
      { header: 'Line', width: 14, value: (r) => r.line_name },
      { header: 'Jenis PM', width: 12, value: (r) => PM_LINE_JENIS_LABEL[r.jenis_pm] || r.jenis_pm },
      { header: 'PIC', width: 18, value: (r) => r.pic_name },
      { header: 'Ketepatan', width: 14, value: (r) => onTimeLabel(r.on_time) },
      { header: 'Keterangan', width: 36, value: (r) => r.keterangan },
      { header: 'Diinput Oleh', width: 20, value: (r) => r.user_full_name },
      { header: 'Waktu Input (WIB)', width: 18, value: (r) => formatTimestampWib(r.created_at) },
    ],
  });
  return { buffer, filename: exportFilename('history-pm-line') };
}

async function exportInventoryMovements(filters) {
  const rows = assertWithinExportLimit(await inventoryQueries.findAllMovementsForExport({ ...filters, maxRows: FETCH_LIMIT }));
  const buffer = buildXlsxBuffer({
    sheetName: 'History Inventory',
    rows,
    columns: [
      { header: 'Waktu (WIB)', width: 18, value: (r) => formatTimestampWib(r.created_at) },
      { header: 'Spare Part Number', width: 22, value: (r) => r.spare_part_number },
      { header: 'Nama Item', width: 28, value: (r) => r.part_name },
      { header: 'Jenis', width: 14, value: (r) => MOVEMENT_TYPE_LABEL[r.movement_type] || r.movement_type },
      // Sama dengan UI: Stock Out tampil negatif.
      { header: 'Qty', width: 10, value: (r) => (r.movement_type === 'STOCK_OUT' ? -Number(r.qty) : Number(r.qty)) },
      { header: 'Catatan', width: 36, value: (r) => r.note },
      { header: 'Oleh', width: 20, value: (r) => r.user_full_name },
    ],
  });
  return { buffer, filename: exportFilename('history-inventory') };
}

async function exportAuditLog(filters) {
  const rows = assertWithinExportLimit(await auditLogQueries.findAllForExport({ ...filters, maxRows: FETCH_LIMIT }));
  const buffer = buildXlsxBuffer({
    sheetName: 'Audit Log',
    rows,
    columns: [
      { header: 'Waktu (WIB)', width: 18, value: (r) => formatTimestampWib(r.created_at) },
      { header: 'User', width: 22, value: (r) => r.user_full_name },
      { header: 'Username', width: 18, value: (r) => r.user_username },
      { header: 'Tabel', width: 24, value: (r) => r.table_name },
      { header: 'Record ID', width: 11, value: (r) => (r.record_id === null ? '' : Number(r.record_id)) },
      { header: 'Aksi', width: 10, value: (r) => r.action },
      { header: 'Keterangan', width: 60, value: (r) => r.action_detail },
    ],
  });
  return { buffer, filename: exportFilename('audit-log') };
}

const PM_PART_STATUS_LABEL = { OK: 'OK', WARNING: 'Warning', DANGER: 'Danger' };

/**
 * Daftar Monitoring PM Part (filter sama dengan list: line_id, status, search).
 * Memakai listPmPart() yang SAMA dengan layar, jadi angka & urutannya identik
 * (termasuk jalur snapshot kalau filter status dipakai), cuma tanpa paginasi.
 */
async function exportPmPartMonitoring({ lineId, status, search }) {
  const { items } = await pmPartService.listPmPart({ lineId, status, search, page: 1, limit: FETCH_LIMIT });
  const rows = assertWithinExportLimit(items);
  const buffer = buildXlsxBuffer({
    sheetName: 'Monitoring PM Part',
    rows,
    columns: [
      { header: 'Line', width: 14, value: (r) => r.line_name },
      { header: 'Jig', width: 16, value: (r) => r.jig_name },
      { header: 'Drawing No (IPDP)', width: 20, value: (r) => r.drawing_no },
      { header: 'Part Name', width: 28, value: (r) => r.part_name },
      { header: 'Supplier Utama', width: 24, value: (r) => r.primary_supplier_name },
      { header: 'Counter', width: 12, value: (r) => r.counter },
      { header: 'Target Shot', width: 12, value: (r) => r.target_shot },
      { header: 'Sisa Shot', width: 12, value: (r) => r.remaining_shot },
      { header: 'Pemakaian/Hari', width: 15, value: (r) => r.usage_per_day },
      { header: 'Keausan (%)', width: 12, value: (r) => r.wear_percentage },
      { header: 'Estimasi PM', width: 13, value: (r) => r.estimated_pm_date },
      { header: 'Status', width: 10, value: (r) => PM_PART_STATUS_LABEL[r.status] || r.status },
      { header: 'Terakhir Diganti', width: 16, value: (r) => dateUtils.formatDate(r.last_tgl_ganti) },
    ],
  });
  return { buffer, filename: exportFilename('monitoring-pm-part') };
}

module.exports = {
  exportPmPartHistory,
  exportPmLineHistory,
  exportInventoryMovements,
  exportAuditLog,
  exportPmPartMonitoring,
};
