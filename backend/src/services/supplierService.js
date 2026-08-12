// src/services/supplierService.js
const db = require('../config/db');
const supplierQueries = require('../sql/supplierQueries');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');

async function listSuppliers({ isActive, search }) {
  return supplierQueries.findAll({ isActive, search });
}

async function getSupplierDetail(id) {
  const supplier = await supplierQueries.findById(id);
  if (!supplier) throw AppError.notFound('Supplier tidak ditemukan');
  return supplier;
}

async function createSupplier(data, userId) {
  const existing = await supplierQueries.findByName(data.supplier_name);
  if (existing) {
    throw AppError.badRequest('Validasi gagal', { supplier_name: 'Nama Supplier sudah dipakai' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const created = await supplierQueries.create(data, client);

    await recordAudit(
      { tableName: 'suppliers', recordId: created.id, action: 'CREATE', oldValue: null, newValue: created, userId },
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

async function updateSupplier(id, fields, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await supplierQueries.findById(id, client);
    if (!before) {
      throw AppError.notFound('Supplier tidak ditemukan');
    }

    if (fields.supplier_name !== undefined && fields.supplier_name !== before.supplier_name) {
      const existing = await supplierQueries.findByName(fields.supplier_name, client);
      if (existing && existing.id !== id) {
        throw AppError.badRequest('Validasi gagal', { supplier_name: 'Nama Supplier sudah dipakai' });
      }
    }

    const updated = await supplierQueries.update(id, fields, client);

    await recordAudit(
      { tableName: 'suppliers', recordId: id, action: 'UPDATE', oldValue: before, newValue: updated, userId },
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

async function deleteSupplier(id, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await supplierQueries.findById(id, client);
    if (!before) {
      throw AppError.notFound('Supplier tidak ditemukan');
    }

    // Sama filosofi guard-nya dengan lineService.deleteLine - jangan biarin
    // Supplier kehapus diam-diam kalau masih dipakai di Part manapun,
    // operator harus lepas link satu-satu dulu (biar sadar dampaknya).
    const linkCount = await supplierQueries.countPartLinksBySupplier(id, client);
    if (linkCount > 0) {
      throw AppError.conflict('Supplier masih terhubung ke Part, lepas relasinya dulu sebelum menghapus');
    }

    await supplierQueries.remove(id, userId, client);

    await recordAudit(
      {
        tableName: 'suppliers',
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

module.exports = { listSuppliers, getSupplierDetail, createSupplier, updateSupplier, deleteSupplier };