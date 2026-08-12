// src/sql/notificationQueries.js
const db = require('../config/db');

async function findLastSent(notificationType, refId, runner = db) {
  const result = await runner.query(
    `SELECT * FROM notification_log
     WHERE notification_type = $1 AND ref_id = $2 AND status = 'SENT'
     ORDER BY sent_at DESC LIMIT 1`,
    [notificationType, refId]
  );
  return result.rows[0] || null;
}

async function insertLog({ notification_type, ref_id, recipients, status, error_message }, runner = db) {
  const result = await runner.query(
    `INSERT INTO notification_log (notification_type, ref_id, recipients, status, error_message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, notification_type, ref_id, recipients, status, error_message, sent_at`,
    [notification_type, ref_id, (recipients || []).join(','), status, error_message || null]
  );
  return result.rows[0];
}

async function findRecentByType(notificationType, { page = 1, limit = 20 } = {}, runner = db) {
  const offset = (Number(page) - 1) * Number(limit);
  const countResult = await runner.query(`SELECT COUNT(*)::int AS total FROM notification_log WHERE notification_type = $1`, [
    notificationType,
  ]);
  const dataResult = await runner.query(
    `SELECT * FROM notification_log WHERE notification_type = $1 ORDER BY sent_at DESC LIMIT $2 OFFSET $3`,
    [notificationType, Number(limit), offset]
  );
  return { items: dataResult.rows, total: countResult.rows[0].total, page: Number(page), limit: Number(limit) };
}

/**
 * Ambil N log notifikasi TERBARU LINTAS SEMUA type (bukan per-type kayak
 * findRecentByType) - dipakai buat dropdown bell icon di Topbar. Cuma
 * status SENT (FAILED itu info debugging Ops, bukan buat ditampilin ke
 * user biasa - lihat notificationJob.js/notificationService.js kalau
 * butuh cek yang gagal kirim).
 */
async function findRecent(limit = 20, runner = db) {
  const result = await runner.query(
    `SELECT id, notification_type, ref_id, recipients, sent_at
     FROM notification_log
     WHERE status = 'SENT'
     ORDER BY sent_at DESC
     LIMIT $1`,
    [Number(limit)]
  );
  return result.rows;
}

/**
 * Hitung notifikasi dalam N jam terakhir - dipakai buat badge angka di bell
 * icon. SENGAJA dilabeli "N jam terakhir" di frontend, BUKAN "belum dibaca"
 * - notification_log gak punya kolom read/unread per-user (skema ini
 * murni audit trail pengiriman email, bukan inbox personal), jadi jangan
 * pura-pura ada state read/unread yang sebenernya gak ke-track.
 */
async function countRecentSince(hours = 24, runner = db) {
  const result = await runner.query(
    `SELECT COUNT(*)::int AS total FROM notification_log
     WHERE status = 'SENT' AND sent_at >= now() - ($1 || ' hours')::interval`,
    [hours]
  );
  return result.rows[0].total;
}

module.exports = { findLastSent, insertLog, findRecentByType, findRecent, countRecentSince };