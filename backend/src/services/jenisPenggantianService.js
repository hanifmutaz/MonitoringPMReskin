// src/services/jenisPenggantianService.js
const db = require('../config/db');
const jenisQueries = require('../sql/jenisPenggantianQueries');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');

async function listJenis({ isActive } = {}) {
  return jenisQueries.findAll({ isActive });
}

// "Part Aus" -> "PART_AUS". Kode ini disimpan di pm_part_history dan tidak
// bisa diubah lagi, makanya dibuat otomatis dari nama, bukan diketik user.
function generateCode(label) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20)
    .replace(/_+$/g, '');
}

async function createJenis(data, userId) {
  const label = data.label.trim();
  const code = generateCode(label);
  if (!code) {
    throw AppError.badRequest('Validasi gagal', { label: 'Nama jenis harus mengandung huruf atau angka' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    if (await jenisQueries.findByCode(code, client)) {
      throw AppError.badRequest('Validasi gagal', { label: 'Jenis dengan nama ini sudah ada' });
    }

    const created = await jenisQueries.create(
      { code, label, counts_in_ketepatan: data.counts_in_ketepatan ?? true },
      client
    );

    await recordAudit(
      { tableName: 'jenis_penggantian', recordId: created.id, action: 'CREATE', oldValue: null, newValue: created, userId },
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

async function updateJenis(id, fields, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await jenisQueries.findById(id, client);
    if (!before) throw AppError.notFound('Jenis penggantian tidak ditemukan');

    const updated = await jenisQueries.update(
      id,
      {
        label: fields.label === undefined ? undefined : fields.label.trim(),
        counts_in_ketepatan: fields.counts_in_ketepatan,
        is_active: fields.is_active,
      },
      client
    );

    await recordAudit(
      { tableName: 'jenis_penggantian', recordId: id, action: 'UPDATE', oldValue: before, newValue: updated, userId },
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

module.exports = { listJenis, createJenis, updateJenis, generateCode };
