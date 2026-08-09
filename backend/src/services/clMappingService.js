// src/services/clMappingService.js
const db = require('../config/db');
const clMappingQueries = require('../sql/clMappingQueries');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');

async function listByPart(partId) {
  const partOk = await clMappingQueries.partExists(partId);
  if (!partOk) {
    throw AppError.notFound('Part tidak ditemukan');
  }
  return clMappingQueries.findByPartId(partId);
}

async function createMapping(partId, data, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const partOk = await clMappingQueries.partExists(partId, client);
    if (!partOk) {
      throw AppError.notFound('Part tidak ditemukan');
    }

    const existing = await clMappingQueries.findByPartAndClNo(partId, data.cl_no, client);
    if (existing) {
      throw AppError.badRequest('Validasi gagal', { cl_no: 'CL No ini sudah dipetakan ke Part yang sama' });
    }

    const created = await clMappingQueries.create({ part_id: partId, ...data }, client);

    await recordAudit(
      {
        tableName: 'part_cl_mapping',
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

async function deleteMapping(id, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await clMappingQueries.findById(id, client);
    if (!before) {
      throw AppError.notFound('Mapping tidak ditemukan');
    }

    await clMappingQueries.remove(id, client);

    await recordAudit(
      { tableName: 'part_cl_mapping', recordId: id, action: 'DELETE', oldValue: before, newValue: null, userId },
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

module.exports = { listByPart, createMapping, deleteMapping };
