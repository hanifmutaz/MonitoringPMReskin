// src/services/partService.js
const db = require('../config/db');
const partQueries = require('../sql/partQueries');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');

async function listParts({ lineId, search, page, limit }) {
  const pageNum = Number(page) > 0 ? Number(page) : 1;
  const limitNum = Number(limit) > 0 ? Number(limit) : 20;
  return partQueries.findAll({ lineId, search, page: pageNum, limit: limitNum });
}

// Dipakai Form PM Part pas operator scan barcode Drawing No pakai kamera
// iPad. AppError.badRequest kalau drawing_no kosong - biar konsisten sama
// pola validasi endpoint lain (dicek di controller sebelum masuk service
// sebenarnya lebih lazim, tapi lookup ini query tunggal simpel jadi cukup
// di sini tanpa validator file terpisah).
async function lookupPartsByDrawingNo(drawingNo) {
  if (!drawingNo || typeof drawingNo !== 'string' || !drawingNo.trim()) {
    throw AppError.badRequest('Validasi gagal', { drawing_no: 'Drawing No wajib diisi' });
  }
  return partQueries.findByDrawingNoExact(drawingNo.trim());
}

async function createPart(data, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const lineOk = await partQueries.lineExists(data.line_id, client);
    if (!lineOk) {
      throw AppError.badRequest('Validasi gagal', { line_id: 'Line tidak ditemukan' });
    }

    const existing = await partQueries.findByLineJigAndDrawing(data.line_id, data.jig_name, data.drawing_no, client);
    if (existing) {
      throw AppError.badRequest('Validasi gagal', {
        drawing_no: 'Kombinasi Line + Jig + Drawing No ini sudah terdaftar',
      });
    }

    const created = await partQueries.create(data, client);

    await recordAudit(
      { tableName: 'parts', recordId: created.id, action: 'CREATE', oldValue: null, newValue: created, userId },
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

async function updatePart(id, fields, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await partQueries.findRawById(id, client);
    if (!before) {
      throw AppError.notFound('Part tidak ditemukan');
    }

    const targetLineId = fields.line_id !== undefined ? fields.line_id : before.line_id;
    const targetJigName = fields.jig_name !== undefined ? fields.jig_name : before.jig_name;
    const targetDrawingNo = fields.drawing_no !== undefined ? fields.drawing_no : before.drawing_no;

    if (fields.line_id !== undefined) {
      const lineOk = await partQueries.lineExists(fields.line_id, client);
      if (!lineOk) {
        throw AppError.badRequest('Validasi gagal', { line_id: 'Line tidak ditemukan' });
      }
    }

    if (fields.line_id !== undefined || fields.jig_name !== undefined || fields.drawing_no !== undefined) {
      const existing = await partQueries.findByLineJigAndDrawing(targetLineId, targetJigName, targetDrawingNo, client);
      if (existing && existing.id !== id) {
        throw AppError.badRequest('Validasi gagal', {
          drawing_no: 'Kombinasi Line + Jig + Drawing No ini sudah terdaftar',
        });
      }
    }

    const updated = await partQueries.update(id, fields, client);

    await recordAudit(
      { tableName: 'parts', recordId: id, action: 'UPDATE', oldValue: before, newValue: updated, userId },
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

async function deletePart(id, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await partQueries.findRawById(id, client);
    if (!before) {
      throw AppError.notFound('Part tidak ditemukan');
    }

    const historyCount = await partQueries.countHistoryByPart(id, client);
    if (historyCount > 0) {
      throw AppError.conflict('Part masih memiliki riwayat penggantian, tidak bisa dihapus');
    }

    await partQueries.remove(id, client);

    await recordAudit(
      { tableName: 'parts', recordId: id, action: 'DELETE', oldValue: before, newValue: null, userId },
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

module.exports = { listParts, lookupPartsByDrawingNo, createPart, updatePart, deletePart };
