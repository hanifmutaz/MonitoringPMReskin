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

  // Nama sama dengan Line di Recycle Bin yang masih punya Part? Jangan menebak
  // diam-diam: minta konfirmasi (restore Line lama, atau sengaja buat baru).
  // Part menunjuk ke ID Line, bukan nama - Line baru TIDAK mewarisi Part lama.
  const deletedSameName = await lineQueries.findDeletedWithParts(data.line_name);
  const mode = data.on_deleted_line_conflict; // 'restore' | 'create_new' | undefined
  if (deletedSameName.length > 0 && !mode) {
    const old = deletedSameName[0];
    throw new AppError(
      `Line "${old.line_name}" pernah dihapus dan masih punya ${old.part_count} Part di Recycle Bin. Restore Line lama, atau buat sebagai Line baru?`,
      409,
      {
        code: 'LINE_IN_RECYCLE_BIN',
        deleted_line_id: old.id,
        line_name: old.line_name,
        part_count: old.part_count,
        active_part_count: old.active_part_count,
      }
    );
  }
  if (deletedSameName.length > 0 && mode === 'restore') {
    return restoreDeletedLine(deletedSameName[0].id, userId);
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

async function restoreDeletedLine(id, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const restored = await lineQueries.restoreDeleted(id, client);
    if (!restored) throw AppError.notFound('Line di Recycle Bin tidak ditemukan');
    await recordAudit(
      {
        tableName: 'lines',
        recordId: id,
        action: 'RESTORE',
        oldValue: null,
        newValue: restored,
        userId,
        actionDetail: `Line "${restored.line_name}" direstore dari Recycle Bin saat membuat Line bernama sama`,
      },
      client
    );
    await client.query('COMMIT');
    return { ...restored, restored: true };
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

    await lineQueries.remove(id, userId, client);

    await recordAudit(
      {
        tableName: 'lines',
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

module.exports = { listLines, createLine, updateLine, deleteLine };