// src/services/notificationService.js
//
// TAHAP 1: Notifikasi email untuk Part berstatus DANGER (PM Part).
// TAHAP 2: Notifikasi email untuk Inventory Item berstatus ORDER (stok <=
// ROP) - rumus ROP/Safety Stock (Q2/Q3) sudah fix, lihat migration
// 1700000010000 & inventoryService.getRopMetrics().
//
// LOGIC ANTI-SPAM (Q8 - jeda reminder bisa di-setting):
//   - notif_pm_part_repeat = FALSE -> kirim SEKALI SAJA per part yang masuk
//     DANGER (kalau sudah pernah ada log SENT sebelumnya, skip terus sampai
//     part itu sempat keluar dari DANGER lagi - tapi versi sederhana ini
//     TIDAK melacak "keluar dari DANGER", jadi berlaku sebagai "sekali seumur
//     hidup notification_log" - cukup untuk kebutuhan saat ini, bisa
//     disempurnakan nanti kalau perlu reset otomatis saat part diganti).
//   - notif_pm_part_repeat = TRUE -> kirim ulang tiap notif_pm_part_interval_hours
//     jam sekali, selama part MASIH DANGER tiap kali job jalan.

const settingsService = require('./settingsService');
const pmPartService = require('./pmPartService');
const inventoryService = require('./inventoryService');
const userQueries = require('../sql/userQueries');
const notificationQueries = require('../sql/notificationQueries');
const mailer = require('../utils/mailer');
const logger = require('../utils/logger');

function buildPmPartDangerEmail(part) {
  const subject = `[PM Monitoring] Part perlu diganti segera - ${part.drawing_no} (${part.jig_name})`;
  const html = `
    <p>Part berikut sudah berstatus <strong style="color:#c0392b">DANGER</strong> dan perlu segera ditindaklanjuti (ganti part / order spare):</p>
    <table cellpadding="6" style="border-collapse:collapse;border:1px solid #ddd">
      <tr><td style="border:1px solid #ddd"><strong>Line</strong></td><td style="border:1px solid #ddd">${part.line_name}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Jig</strong></td><td style="border:1px solid #ddd">${part.jig_name}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Drawing No</strong></td><td style="border:1px solid #ddd">${part.drawing_no}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Part Name</strong></td><td style="border:1px solid #ddd">${part.part_name}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Counter</strong></td><td style="border:1px solid #ddd">${part.counter.toLocaleString('id-ID')} / ${part.target_shot.toLocaleString('id-ID')}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Sisa Shot</strong></td><td style="border:1px solid #ddd">${part.remaining_shot.toLocaleString('id-ID')}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Estimasi Tanggal PM</strong></td><td style="border:1px solid #ddd">${part.estimated_pm_date || '-'}</td></tr>
    </table>
    <p style="color:#888;font-size:12px">Email otomatis dari PM Monitoring System - jangan reply.</p>
  `;
  return { subject, html };
}

/**
 * Cek semua Part berstatus DANGER, kirim email ke role penerima yang
 * dikonfigurasi di Settings, dengan jeda anti-spam sesuai
 * notif_pm_part_interval_hours & notif_pm_part_repeat.
 */
async function checkAndSendPmPartNotifications() {
  const enabled = await settingsService.getSetting('notif_pm_part_enabled');
  if (!enabled) {
    return { enabled: false, checked: 0, sent: 0, skipped_no_recipient: 0 };
  }

  const settings = await settingsService.getSettings([
    'notif_pm_part_recipient_roles',
    'notif_pm_part_interval_hours',
    'notif_pm_part_repeat',
  ]);

  const recipientRoles = String(settings.notif_pm_part_recipient_roles || 'Admin')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  const intervalHours = Number(settings.notif_pm_part_interval_hours) || 24;
  const repeat = !!settings.notif_pm_part_repeat;

  const allMetrics = await pmPartService.getAllComputedMetrics({});
  const dangerParts = allMetrics.filter((p) => p.status === 'DANGER');

  let sentCount = 0;
  let skippedNoRecipient = 0;

  for (const part of dangerParts) {
    const lastSent = await notificationQueries.findLastSent('PM_PART_DANGER', part.part_id);
    if (lastSent) {
      if (!repeat) continue; // sudah pernah kirim & repeat mati -> jangan kirim lagi
      const hoursSince = (Date.now() - new Date(lastSent.sent_at).getTime()) / 3600000;
      if (hoursSince < intervalHours) continue; // masih dalam jeda reminder
    }

    const emails = await userQueries.findActiveEmailsByRoles(recipientRoles);
    if (emails.length === 0) {
      skippedNoRecipient += 1;
      logger.warn(
        `Notifikasi PM Part DANGER (part_id=${part.part_id}, ${part.drawing_no}): tidak ada user aktif dengan email untuk role [${recipientRoles.join(', ')}] - notifikasi dilewati`
      );
      continue;
    }

    const { subject, html } = buildPmPartDangerEmail(part);
    try {
      const { skipped } = await mailer.sendMail({ to: emails, subject, html });
      await notificationQueries.insertLog({
        notification_type: 'PM_PART_DANGER',
        ref_id: part.part_id,
        recipients: emails,
        status: 'SENT',
        error_message: skipped ? 'SMTP belum dikonfigurasi - log dicatat, email tidak benar-benar terkirim' : null,
      });
      sentCount += 1;
    } catch (err) {
      await notificationQueries.insertLog({
        notification_type: 'PM_PART_DANGER',
        ref_id: part.part_id,
        recipients: emails,
        status: 'FAILED',
        error_message: err.message,
      });
      logger.error(`Gagal kirim notifikasi PM Part DANGER untuk part_id=${part.part_id}`, err);
    }
  }

  return { enabled: true, checked: dangerParts.length, sent: sentCount, skipped_no_recipient: skippedNoRecipient };
}

function buildInventoryOrderEmail(item) {
  const subject = `[PM Monitoring] Spare Part perlu di-order - ${item.spare_part_number}`;
  const html = `
    <p>Stok spare part berikut sudah mencapai atau di bawah <strong style="color:#c0392b">Reorder Point (ROP)</strong> dan perlu segera di-order:</p>
    <table cellpadding="6" style="border-collapse:collapse;border:1px solid #ddd">
      <tr><td style="border:1px solid #ddd"><strong>Spare Part Number</strong></td><td style="border:1px solid #ddd">${item.spare_part_number}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Nama Part</strong></td><td style="border:1px solid #ddd">${item.part_name}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Lokasi</strong></td><td style="border:1px solid #ddd">${item.location || '-'}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Stok Saat Ini</strong></td><td style="border:1px solid #ddd">${item.current_stock}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>ROP</strong></td><td style="border:1px solid #ddd">${item.rop}</td></tr>
      <tr><td style="border:1px solid #ddd"><strong>Order Qty disarankan</strong></td><td style="border:1px solid #ddd">${item.order_qty}</td></tr>
    </table>
    <p style="color:#888;font-size:12px">Email otomatis dari PM Monitoring System - jangan reply.</p>
  `;
  return { subject, html };
}

/**
 * Cek semua Inventory Item berstatus ORDER (stok <= ROP), kirim email sesuai
 * setting notif_inventory_*, dengan jeda anti-spam yang sama polanya dengan
 * checkAndSendPmPartNotifications.
 */
async function checkAndSendInventoryOrderNotifications() {
  const enabled = await settingsService.getSetting('notif_inventory_enabled');
  if (!enabled) {
    return { enabled: false, checked: 0, sent: 0, skipped_no_recipient: 0 };
  }

  const settings = await settingsService.getSettings([
    'notif_inventory_recipient_roles',
    'notif_inventory_interval_hours',
    'notif_inventory_repeat',
  ]);

  const recipientRoles = String(settings.notif_inventory_recipient_roles || 'Admin')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  const intervalHours = Number(settings.notif_inventory_interval_hours) || 24;
  const repeat = !!settings.notif_inventory_repeat;

  const allItems = await inventoryService.getRopMetrics();
  const orderItems = allItems.filter((i) => i.status === 'ORDER');

  let sentCount = 0;
  let skippedNoRecipient = 0;

  for (const item of orderItems) {
    const lastSent = await notificationQueries.findLastSent('INVENTORY_ORDER', item.id);
    if (lastSent) {
      if (!repeat) continue;
      const hoursSince = (Date.now() - new Date(lastSent.sent_at).getTime()) / 3600000;
      if (hoursSince < intervalHours) continue;
    }

    const emails = await userQueries.findActiveEmailsByRoles(recipientRoles);
    if (emails.length === 0) {
      skippedNoRecipient += 1;
      logger.warn(
        `Notifikasi Inventory ORDER (item_id=${item.id}, ${item.spare_part_number}): tidak ada user aktif dengan email untuk role [${recipientRoles.join(', ')}] - notifikasi dilewati`
      );
      continue;
    }

    const { subject, html } = buildInventoryOrderEmail(item);
    try {
      const { skipped } = await mailer.sendMail({ to: emails, subject, html });
      await notificationQueries.insertLog({
        notification_type: 'INVENTORY_ORDER',
        ref_id: item.id,
        recipients: emails,
        status: 'SENT',
        error_message: skipped ? 'SMTP belum dikonfigurasi - log dicatat, email tidak benar-benar terkirim' : null,
      });
      sentCount += 1;
    } catch (err) {
      await notificationQueries.insertLog({
        notification_type: 'INVENTORY_ORDER',
        ref_id: item.id,
        recipients: emails,
        status: 'FAILED',
        error_message: err.message,
      });
      logger.error(`Gagal kirim notifikasi Inventory ORDER untuk item_id=${item.id}`, err);
    }
  }

  return { enabled: true, checked: orderItems.length, sent: sentCount, skipped_no_recipient: skippedNoRecipient };
}

module.exports = { checkAndSendPmPartNotifications, checkAndSendInventoryOrderNotifications };
