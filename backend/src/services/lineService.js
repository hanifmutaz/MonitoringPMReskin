// src/services/lineService.js
const db = require('../config/db');
const lineQueries = require('../sql/lineQueries');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');

async function listLines({ isActive }) {
  return lineQueries.findAll({ isActive });
}

async function createLine(data, userId) {
  const existing = await lineQueries.findByName(data.line_name);
  if (existing) {
    throw AppError.badRequest('Validasi gagal', { line_name: 'Line Name sudah dipakai' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const created = await lineQueries.create(
      {
        line_name: data.line_name,
        auto_reset_weekly_on_monthly:
          data.auto_reset_weekly_on_monthly === undefined ? null : data.auto_reset_weekly_on_monthly,
      },
      client
    );

    await recordAudit(
      {
        tableName: 'lines',
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

async function updateLine(id, fields, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await lineQueries.findById(id, client);
    if (!before) {
      throw AppError.notFound('Line tidak ditemukan');
    }

    if (fields.line_name !== undefined && fields.line_name !== before.line_name) {
      const existing = await lineQueries.findByName(fields.line_name, client);
      if (existing && existing.id !== id) {
        throw AppError.badRequest('Validasi gagal', { line_name: 'Line Name sudah dipakai' });
      }
    }

    const updated = await lineQueries.update(id, fields, client);

    await recordAudit(
      {
        tableName: 'lines',
        recordId: id,
        action: 'UPDATE',
        oldValue: before,
        newValue: updated,
        userId,
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

async function deleteLine(id, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await lineQueries.findById(id, client);
    if (!before) {
      throw AppError.notFound('Line tidak ditemukan');
    }

    const partCount = await lineQueries.countPartsByLine(id, client);
    if (partCount > 0) {
      throw AppError.conflict('Line masih memiliki Part terkait, tidak bisa dihapus');
    }

    await lineQueries.remove(id, client);

    await recordAudit(
      {
        tableName: 'lines',
        recordId: id,
        action: 'DELETE',
        oldValue: before,
        newValue: null,
        userId,
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

module.exports = { listLines, createLine, updateLine, deleteLine };
