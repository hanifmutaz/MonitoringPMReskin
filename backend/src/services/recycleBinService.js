// src/services/recycleBinService.js
//
// Engine GENERIK buat Recycle Bin - satu implementasi dipakai semua 7
// entity (lihat recycleBinRegistry.js), bukan 7 service terpisah yang
// isinya copy-paste. Table name SELALU dari config.table (whitelist),
// TIDAK PERNAH langsung dari req.params.entity - lihat getEntityConfig()
// yang jadi satu-satunya gerbang validasi entity key sebelum nyentuh SQL.
//
// Tiga operasi di sini SENGAJA cuma bisa diakses Admin (di-gate di
// recycleBinRoutes.js, bukan di sini) - restore & permanent-delete adalah
// operasi sensitif yang mengubah/menghapus jejak Master Data secara luas,
// beda dari delete satuan yang masih lewat guard per-entity biasa
// (lineService.deleteLine dkk, TIDAK diubah/dilewati di sini).

const db = require('../config/db');
const { getEntityConfig, REGISTRY } = require('../config/recycleBinRegistry');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');

function requireEntity(entityKey) {
  const config = getEntityConfig(entityKey);
  if (!config) {
    throw AppError.badRequest('Validasi gagal', {
      entity: `Entity "${entityKey}" tidak dikenal / tidak punya Recycle Bin`,
    });
  }
  return config;
}

function listEntities() {
  return Object.entries(REGISTRY).map(([key, cfg]) => ({ key, label: cfg.label }));
}

async function listDeleted(entityKey) {
  const config = requireEntity(entityKey);
  const result = await db.query(config.listSql);
  return result.rows;
}

async function restore(entityKey, id, userId) {
  const config = requireEntity(entityKey);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await client.query(`SELECT * FROM ${config.table} WHERE id = $1 AND deleted_at IS NOT NULL`, [
      id,
    ]);
    if (!before.rows[0]) {
      throw AppError.notFound('Data tidak ditemukan di Recycle Bin (mungkin sudah direstore/dihapus permanen)');
    }

    let updated;
    try {
      const result = await client.query(
        `UPDATE ${config.table} SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING *`,
        [id]
      );
      updated = result.rows[0];
    } catch (err) {
      // Unique constraint (nama/kode sudah dipakai record aktif lain yang
      // dibuat setelah data ini di-trash) - kasih pesan jelas, bukan raw
      // error DB (lihat migration 1700000017000, kode 23505).
      if (err.code === '23505') {
        throw AppError.conflict(
          `Tidak bisa direstore - nama/kode ini sudah dipakai data ${config.label} lain yang masih aktif. Ganti nama data aktif itu dulu, baru restore.`
        );
      }
      throw err;
    }

    await recordAudit(
      {
        tableName: config.table,
        recordId: id,
        action: 'RESTORE',
        oldValue: before.rows[0],
        newValue: updated,
        userId,
        actionDetail: `Direstore dari Recycle Bin (${config.label})`,
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

async function permanentDelete(entityKey, id, userId) {
  const config = requireEntity(entityKey);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await client.query(`SELECT * FROM ${config.table} WHERE id = $1 AND deleted_at IS NOT NULL`, [
      id,
    ]);
    if (!before.rows[0]) {
      throw AppError.notFound('Data tidak ditemukan di Recycle Bin (mungkin sudah direstore/dihapus permanen)');
    }

    try {
      await client.query(`DELETE FROM ${config.table} WHERE id = $1`, [id]);
    } catch (err) {
      // FK constraint - masih direferensikan data lain di luar 7 entity
      // recycle bin ini (mis. pm_part_history, production_cache dst yang
      // tidak ikut soft-delete framework). Permanent delete BUKAN aksi yang
      // dipaksakan lewat cascade - Admin harus tahu & bereskan dulu.
      if (err.code === '23503') {
        throw AppError.conflict(
          `Tidak bisa dihapus permanen - data ${config.label} ini masih direferensikan data lain di sistem.`
        );
      }
      throw err;
    }

    await recordAudit(
      {
        tableName: config.table,
        recordId: id,
        action: 'DELETE',
        oldValue: before.rows[0],
        newValue: null,
        userId,
        actionDetail: `PERMANEN - dihapus dari Recycle Bin (${config.label}), tidak bisa direstore lagi`,
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

/**
 * Bulk soft-delete (checkbox massal di tabel Master Data) - GENERIK, SKIP
 * guard referensial per-baris yang berlaku di delete satuan (mis.
 * lineService.deleteLine yang blokir kalau "Line masih ada Part"). Ini
 * sengaja jadi alat power Admin buat testing (SOW: "CRUD diadakan semuanya
 * untuk testing") - tetap AMAN karena soft-delete = reversible lewat
 * Restore, BUKAN hard delete. protectColumn (mis. roles.is_system) tetap
 * dihormati - row yang dilindungi otomatis di-skip, gak ikut ke-checklist.
 */
async function bulkSoftDelete(entityKey, ids, userId) {
  const config = requireEntity(entityKey);
  if (!Array.isArray(ids) || ids.length === 0) {
    throw AppError.badRequest('Validasi gagal', { ids: 'ids wajib berupa array dan tidak boleh kosong' });
  }
  const numericIds = ids.map(Number).filter((n) => Number.isInteger(n));
  if (numericIds.length === 0) {
    throw AppError.badRequest('Validasi gagal', { ids: 'ids harus berisi angka valid' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const protectClause = config.protectColumn ? `AND (${config.protectColumn} IS NOT TRUE)` : '';

    const result = await client.query(
      `UPDATE ${config.table} SET deleted_at = now(), deleted_by = $1
       WHERE id = ANY($2::int[]) AND deleted_at IS NULL ${protectClause}
       RETURNING id`,
      [userId, numericIds]
    );

    const deletedIds = result.rows.map((r) => r.id);
    const skippedIds = numericIds.filter((id) => !deletedIds.includes(id));

    await recordAudit(
      {
        tableName: config.table,
        recordId: null,
        action: 'DELETE',
        oldValue: { ids: deletedIds },
        newValue: null,
        userId,
        actionDetail: `BULK DELETE (${config.label}) - ${deletedIds.length} data masuk Recycle Bin${
          skippedIds.length ? `, ${skippedIds.length} dilewati (dilindungi/sudah terhapus)` : ''
        }`,
      },
      client
    );

    await client.query('COMMIT');
    return { deletedIds, skippedIds };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listEntities, listDeleted, restore, permanentDelete, bulkSoftDelete };