// src/services/partSupplierService.js
const db = require('../config/db');
const partSupplierQueries = require('../sql/partSupplierQueries');
const supplierQueries = require('../sql/supplierQueries');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');

async function listByPart(partId) {
  const partOk = await partSupplierQueries.partExists(partId);
  if (!partOk) {
    throw AppError.notFound('Part tidak ditemukan');
  }
  return partSupplierQueries.findByPartId(partId);
}

async function createLink(partId, data, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const partOk = await partSupplierQueries.partExists(partId, client);
    if (!partOk) {
      throw AppError.notFound('Part tidak ditemukan');
    }

    const supplier = await supplierQueries.findById(data.supplier_id, client);
    if (!supplier) {
      throw AppError.badRequest('Validasi gagal', { supplier_id: 'Supplier tidak ditemukan' });
    }

    const existing = await partSupplierQueries.findByPartAndSupplier(partId, data.supplier_id, client);
    if (existing) {
      throw AppError.badRequest('Validasi gagal', { supplier_id: 'Supplier ini sudah terhubung ke Part yang sama' });
    }

    const isPrimary = Boolean(data.is_primary);
    // Kalau link baru ini langsung ditandai primary, unset dulu yang lama
    // (kalau ada) DALAM transaction yang sama - hindari nabrak partial
    // unique index uq_part_suppliers_one_primary (migration 1700000014000).
    if (isPrimary) {
      await partSupplierQueries.unsetPrimaryForPart(partId, client);
    }

    const created = await partSupplierQueries.create(
      { part_id: partId, supplier_id: data.supplier_id, is_primary: isPrimary, notes: data.notes ?? null },
      client
    );

    await recordAudit(
      { tableName: 'part_suppliers', recordId: created.id, action: 'CREATE', oldValue: null, newValue: created, userId },
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

async function updateNotes(id, notes, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await partSupplierQueries.findById(id, client);
    if (!before) {
      throw AppError.notFound('Relasi Part-Supplier tidak ditemukan');
    }

    const updated = await partSupplierQueries.updateNotes(id, notes, client);

    await recordAudit(
      { tableName: 'part_suppliers', recordId: id, action: 'UPDATE', oldValue: before, newValue: updated, userId },
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

// Nge-set (atau nge-lepas) status "Supplier Utama" buat 1 link tertentu.
// Set TRUE -> unset dulu link lain di Part yang sama (maksimal 1 primary
// per Part, lihat komentar migration), baru set link ini. Set FALSE -> cuma
// unset link ini sendiri, gak nyentuh yang lain.
async function setPrimary(id, isPrimary, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await partSupplierQueries.findById(id, client);
    if (!before) {
      throw AppError.notFound('Relasi Part-Supplier tidak ditemukan');
    }

    if (isPrimary) {
      await partSupplierQueries.unsetPrimaryForPart(before.part_id, client);
    }

    const updated = await partSupplierQueries.setPrimary(id, isPrimary, client);

    await recordAudit(
      { tableName: 'part_suppliers', recordId: id, action: 'UPDATE', oldValue: before, newValue: updated, userId },
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

async function deleteLink(id, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await partSupplierQueries.findById(id, client);
    if (!before) {
      throw AppError.notFound('Relasi Part-Supplier tidak ditemukan');
    }

    await partSupplierQueries.remove(id, userId, client);

    await recordAudit(
      {
        tableName: 'part_suppliers',
        recordId: id,
        action: 'DELETE',
        oldValue: before,
        newValue: null,
        userId,
        actionDetail: 'Soft delete - bisa direstore lewat Recycle Bin',
      },
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

module.exports = { listByPart, createLink, updateNotes, setPrimary, deleteLink };