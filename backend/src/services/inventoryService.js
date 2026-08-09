// src/services/inventoryService.js
//
// Struktur DASAR Inventory - stock per Inventory Item + histori mutasi.
// BELUM termasuk ROP/Safety Stock/Status OK-ORDER (masih hold, lihat
// migration 1700000007000). Fitur notifikasi email "harus order" nanti
// dibangun di atas fondasi ini setelah rumusnya fix.
//
// PRINSIP: current_stock di inventory_items itu DENORMALISASI dari histori
// inventory_stock_movements - setiap mutasi WAJIB lewat adjustStock() di
// sini (insert movement + update current_stock) dalam 1 transaksi, supaya
// current_stock selalu konsisten sama total histori movement-nya. Jangan
// pernah UPDATE current_stock langsung tanpa insert movement.

const db = require('../config/db');
const inventoryQueries = require('../sql/inventoryQueries');
const pmPartService = require('./pmPartService');
const settingsService = require('./settingsService');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');

/**
 * Hitung ROP, Safety Stock, Order Qty & Status per Inventory Item.
 *
 * RUMUS (Q2/Q3, fix - hasil reverse-engineer dari SparePart.xlsm, lihat
 * migration 1700000010000):
 *   Konsumsi Spare/Hari (per Part)  = usage_per_day (Pemakaian/Hari AKTUAL
 *     dari pmPartService, BUKAN target statis) / target_shot part itu
 *   Konsumsi Spare/Hari (per Item)  = SUM dari semua Part yang di-link ke
 *     Item ini (many-to-one - prinsip agregasi penuh, konsisten dengan
 *     counter cross-CL di seluruh sistem)
 *   Kebutuhan Spare  = CEIL(Konsumsi Spare/Hari(item) x lead_time_days)
 *   Safety Stock     = CEIL(safety_stock_percentage% x Kebutuhan Spare)
 *   ROP              = Kebutuhan Spare + Safety Stock
 *   Order Qty        = MAX(ROP - current_stock, 0)
 *   Status           = current_stock <= ROP ? 'ORDER' : 'OK'
 *
 * Item dengan lead_time_days = NULL (belum diisi Admin) atau tidak punya
 * Part yang di-link -> ROP tidak bisa dihitung, dikembalikan null dengan
 * status 'NOT_CONFIGURED' (BUKAN 'OK' - supaya tidak salah dikira aman).
 */
async function getRopMetrics() {
  const safetyStockPct = Number(await settingsService.getSetting('inventory_safety_stock_percentage')) || 20;

  const { items: allItems } = await inventoryQueries.findAllItems({ limit: 100000 });
  const allPartMetrics = await pmPartService.getAllComputedMetrics({});
  const usageByPartId = new Map(allPartMetrics.map((p) => [p.part_id, p]));

  const results = [];
  for (const item of allItems) {
    const linkedParts = await inventoryQueries.findPartsByInventoryItem(item.id);

    if (linkedParts.length === 0 || item.lead_time_days === null || item.lead_time_days === undefined) {
      results.push({
        ...item,
        konsumsi_spare_per_hari: null,
        kebutuhan_spare: null,
        safety_stock: null,
        rop: null,
        order_qty: null,
        status: 'NOT_CONFIGURED',
      });
      continue;
    }

    let konsumsiSpareHari = 0;
    for (const linkedPart of linkedParts) {
      const metric = usageByPartId.get(linkedPart.id);
      if (!metric || !metric.target_shot) continue;
      konsumsiSpareHari += metric.usage_per_day / metric.target_shot;
    }

    const kebutuhanSpare = Math.ceil(konsumsiSpareHari * item.lead_time_days);
    const safetyStock = Math.ceil((safetyStockPct / 100) * kebutuhanSpare);
    const rop = kebutuhanSpare + safetyStock;
    const orderQty = Math.max(rop - item.current_stock, 0);
    const status = item.current_stock <= rop ? 'ORDER' : 'OK';

    results.push({
      ...item,
      konsumsi_spare_per_hari: Math.round(konsumsiSpareHari * 10000) / 10000,
      kebutuhan_spare: kebutuhanSpare,
      safety_stock: safetyStock,
      rop,
      order_qty: orderQty,
      status,
    });
  }

  return results;
}

async function listItems({ search, page, limit }) {
  return inventoryQueries.findAllItems({ search, page, limit });
}

async function getItem(id) {
  const item = await inventoryQueries.findItemById(id);
  if (!item) throw AppError.notFound('Inventory Item tidak ditemukan');
  const linkedParts = await inventoryQueries.findPartsByInventoryItem(id);
  return { ...item, linked_parts: linkedParts };
}

async function listMovements(itemId, { page, limit }) {
  const item = await inventoryQueries.findItemById(itemId);
  if (!item) throw AppError.notFound('Inventory Item tidak ditemukan');
  return inventoryQueries.findMovementsByItem(itemId, { page, limit });
}

async function listAllMovements({ item_id, movement_type, page, limit }) {
  return inventoryQueries.findAllMovements({ item_id, movement_type, page, limit });
}

/**
 * Buat Inventory Item baru. `initial_stock` opsional (Q4: "diawal input
 * manual untuk menyesuaikan stock awal") - kalau diisi > 0, langsung dicatat
 * sebagai movement STOCK_IN dengan note "Stok awal", bukan cuma set angka
 * current_stock tanpa jejak histori.
 */
async function createItem(data, userId) {
  const existing = await inventoryQueries.findItemBySparePartNumber(data.spare_part_number);
  if (existing) {
    throw AppError.badRequest('Validasi gagal', { spare_part_number: 'Spare Part Number sudah terdaftar' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const created = await inventoryQueries.createItem(
      {
        spare_part_number: data.spare_part_number,
        part_name: data.part_name,
        location: data.location,
        note: data.note,
        lead_time_days: data.lead_time_days === undefined || data.lead_time_days === '' ? null : Number(data.lead_time_days),
      },
      client
    );

    await recordAudit(
      { tableName: 'inventory_items', recordId: created.id, action: 'CREATE', oldValue: null, newValue: created, userId },
      client
    );

    let finalItem = created;
    const initialStock = Number(data.initial_stock) || 0;
    if (initialStock > 0) {
      await inventoryQueries.insertMovement(
        {
          inventory_item_id: created.id,
          movement_type: 'STOCK_IN',
          qty: initialStock,
          note: 'Stok awal',
          ref_type: null,
          ref_id: null,
          user_id: userId,
        },
        client
      );
      finalItem = await inventoryQueries.adjustCurrentStock(created.id, initialStock, client);
    }

    await client.query('COMMIT');
    return finalItem;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateItem(id, fields, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await inventoryQueries.findRawItemById(id, client);
    if (!before) throw AppError.notFound('Inventory Item tidak ditemukan');

    if (fields.spare_part_number !== undefined && fields.spare_part_number !== before.spare_part_number) {
      const existing = await inventoryQueries.findItemBySparePartNumber(fields.spare_part_number, client);
      if (existing && existing.id !== id) {
        throw AppError.badRequest('Validasi gagal', { spare_part_number: 'Spare Part Number sudah terdaftar' });
      }
    }

    // current_stock TIDAK boleh diubah lewat endpoint ini - harus lewat
    // adjustStock() supaya selalu ada jejak movement-nya.
    // eslint-disable-next-line no-unused-vars
    const { current_stock, ...safeFields } = fields;
    const updated = await inventoryQueries.updateItem(id, safeFields, client);

    await recordAudit(
      { tableName: 'inventory_items', recordId: id, action: 'UPDATE', oldValue: before, newValue: updated, userId },
      client
    );

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Mutasi stok manual (STOCK_IN / STOCK_OUT / ADJUSTMENT). Ini SATU-SATUNYA
 * cara sah buat ubah current_stock - selalu diiringi insert movement supaya
 * ada jejak siapa/kapan/kenapa.
 */
async function adjustStock(itemId, { movement_type, qty, note }, userId, { refType, refId, runner } = {}) {
  const qtyNum = Number(qty);
  if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
    throw AppError.badRequest('Validasi gagal', { qty: 'Qty harus angka bulat > 0' });
  }
  if (!['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'].includes(movement_type)) {
    throw AppError.badRequest('Validasi gagal', { movement_type: 'movement_type tidak valid' });
  }

  const useExternalClient = !!runner;
  const client = runner || (await db.getClient());
  try {
    if (!useExternalClient) await client.query('BEGIN');

    const item = await inventoryQueries.findRawItemById(itemId, client);
    if (!item) throw AppError.notFound('Inventory Item tidak ditemukan');

    const delta = movement_type === 'STOCK_OUT' ? -qtyNum : qtyNum;
    if (movement_type === 'STOCK_OUT' && item.current_stock < qtyNum) {
      throw AppError.conflict(`Stok tidak cukup (stok saat ini: ${item.current_stock}, diminta keluar: ${qtyNum})`);
    }

    const movement = await inventoryQueries.insertMovement(
      {
        inventory_item_id: itemId,
        movement_type,
        qty: qtyNum,
        note,
        ref_type: refType,
        ref_id: refId,
        user_id: userId,
      },
      client
    );
    const updatedItem = await inventoryQueries.adjustCurrentStock(itemId, delta, client);

    await recordAudit(
      {
        tableName: 'inventory_stock_movements',
        recordId: movement.id,
        action: 'CREATE',
        oldValue: null,
        newValue: movement,
        userId,
        actionDetail: `${movement_type} qty=${qtyNum} pada "${item.spare_part_number}" (stok: ${item.current_stock} -> ${updatedItem.current_stock})`,
      },
      client
    );

    if (!useExternalClient) await client.query('COMMIT');
    return updatedItem;
  } catch (err) {
    if (!useExternalClient) await client.query('ROLLBACK');
    throw err;
  } finally {
    if (!useExternalClient) client.release();
  }
}

async function deleteItem(id, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await inventoryQueries.findRawItemById(id, client);
    if (!before) throw AppError.notFound('Inventory Item tidak ditemukan');

    const linkedCount = await inventoryQueries.countLinkedParts(id, client);
    if (linkedCount > 0) {
      throw AppError.conflict('Inventory Item masih dipakai oleh Part lain, lepaskan link-nya dulu sebelum dihapus');
    }

    const movementCount = await inventoryQueries.countMovements(id, client);
    if (movementCount > 0) {
      throw AppError.conflict('Inventory Item sudah punya histori mutasi stok, tidak bisa dihapus (arsipkan/nonaktifkan saja)');
    }

    await inventoryQueries.removeItem(id, client);

    await recordAudit(
      { tableName: 'inventory_items', recordId: id, action: 'DELETE', oldValue: before, newValue: null, userId },
      client
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Link / unlink Part row ke Inventory Item. Many-to-one: 1 Inventory Item
 * bisa dipakai banyak Part row (dikonfirmasi user - Part fisik identik yang
 * dipasang di jig/line berbeda bisa berbagi 1 stok yang sama).
 */
async function linkPartToItem(partId, inventoryItemId, userId) {
  const partQueries = require('../sql/partQueries');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const part = await partQueries.findRawById(partId, client);
    if (!part) throw AppError.notFound('Part tidak ditemukan');

    if (inventoryItemId !== null) {
      const item = await inventoryQueries.findRawItemById(inventoryItemId, client);
      if (!item) throw AppError.notFound('Inventory Item tidak ditemukan');
    }

    const updated = await partQueries.update(partId, { inventory_item_id: inventoryItemId }, client);

    await recordAudit(
      {
        tableName: 'parts',
        recordId: partId,
        action: 'UPDATE',
        oldValue: part,
        newValue: updated,
        userId,
        actionDetail:
          inventoryItemId === null
            ? 'Dilepas dari Inventory Item'
            : `Di-link ke Inventory Item id=${inventoryItemId}`,
      },
      client
    );

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listItems,
  getItem,
  listMovements,
  listAllMovements,
  createItem,
  updateItem,
  adjustStock,
  deleteItem,
  linkPartToItem,
  getRopMetrics,
};