// src/services/settingsService.js
//
// Helper INTERNAL (getSetting/getSettings) dipakai Service lain sejak
// Fase 1 (data sudah ada dari seed migration). Fungsi PUBLIK untuk Admin UI
// (listSettings/updateSetting) baru ditambahkan di Fase 9 sesuai urutan
// Workflow Implementasi 00_SYSTEM_PROMPT.md.

const db = require('../config/db');
const settingsQueries = require('../sql/settingsQueries');
const { recordAudit } = require('../utils/auditLog');
const { validateSettingValue } = require('../validators/settingsValidator');
const AppError = require('../utils/AppError');

function castValue(row) {
  switch (row.value_type) {
    case 'number':
      return Number(row.value);
    case 'boolean':
      return row.value === 'true';
    default:
      return row.value;
  }
}

/**
 * Ambil 1 setting, sudah di-cast sesuai value_type. Return null kalau key
 * tidak ditemukan (caller wajib handle - jangan asumsi selalu ada).
 */
async function getSetting(key) {
  const result = await db.query('SELECT value, value_type FROM app_settings WHERE key = $1', [key]);
  if (result.rows.length === 0) return null;
  return castValue(result.rows[0]);
}

/**
 * Ambil beberapa setting sekaligus (1 round-trip DB), dikembalikan sebagai
 * object { key: castedValue }. Dipakai Service yang butuh banyak setting
 * sekaligus (mis. PM Part butuh pm_part_danger_multiplier + warning_multiplier).
 */
async function getSettings(keys) {
  const result = await db.query('SELECT key, value, value_type FROM app_settings WHERE key = ANY($1)', [keys]);
  const map = {};
  for (const row of result.rows) {
    map[row.key] = castValue(row);
  }
  return map;
}

/**
 * GET /settings - list semua setting apa adanya (value tetap string dari DB,
 * biar frontend yang render sesuai value_type; lihat 05_UI_UX_SPECIFICATION.md §4.9).
 * Diurutkan per category (7 kategori MASTER DOCUMENT Bagian 4).
 *
 * Sekarang setiap row juga bawa `editable_role_ids` (role NON-Admin yang
 * digrant akses edit ke key itu lewat setting_role_access - migration
 * 1700000022000) - dipakai frontend buat nentuin tombol Edit muncul/tidak
 * buat role yang login, dan buat Admin ngatur grant-nya di UI.
 */
async function listSettings() {
  const [rows, accessMap] = await Promise.all([settingsQueries.findAll(), settingsQueries.findAllRoleAccessGrouped()]);
  return rows.map((row) => ({ ...row, editable_role_ids: accessMap[row.key] || [] }));
}

/**
 * Cek apakah `user` (req.user - dari authMiddleware) boleh edit `key`.
 * Admin selalu boleh (superuser, sama pola dengan requirePermission '*').
 * Role lain: harus ada grant eksplisit di setting_role_access.
 */
async function canEditSetting(key, user) {
  if (user.role === 'Admin') return true;
  return settingsQueries.roleHasAccess(key, user.role_id);
}

/**
 * PATCH /settings/:key - update 1 setting, validasi value_type harus cocok
 * (03_API_SPECIFICATION.md §2), audit log wajib (Development Rules §22).
 * `user` = req.user lengkap (bukan cuma id) - dibutuhkan buat cek
 * setting_role_access untuk role non-Admin (Settings sekarang gak lagi
 * hardcode Admin-only di route, lihat settingsRoutes.js).
 */
async function updateSetting(key, value, user) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await settingsQueries.findByKey(key, client);
    if (!before) {
      throw AppError.notFound('Setting key tidak ditemukan');
    }

    if (user.role !== 'Admin') {
      const allowed = await settingsQueries.roleHasAccess(key, user.role_id, client);
      if (!allowed) {
        throw AppError.forbidden('Role Anda tidak punya akses untuk mengubah setting ini');
      }
    }

    const { valid, errors } = validateSettingValue(before.value_type, value, key);
    if (!valid) {
      throw AppError.badRequest('Validasi gagal', errors);
    }

    const updated = await settingsQueries.updateValue(key, String(value), user.id, client);

    // NOTE: audit_log.record_id bertipe INT, sedangkan PK app_settings adalah
    // `key` (VARCHAR) — bukan angka. record_id diisi null di sini (soft
    // reference lewat table_name saja), `key` tetap terekam lengkap di
    // old_value/new_value JSON supaya tetap bisa ditelusuri.
    await recordAudit(
      {
        tableName: 'app_settings',
        recordId: null,
        action: 'UPDATE',
        oldValue: before,
        newValue: updated,
        userId: user.id,
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

/**
 * PATCH /settings/:key/access - Admin only (dicek di route). Replace TOTAL
 * daftar role non-Admin yang boleh edit key ini. Kirim [] buat cabut semua
 * akses non-Admin (balik ke Admin-only, sama seperti sebelum fitur ini ada).
 */
async function setSettingAccess(key, roleIds, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const setting = await settingsQueries.findByKey(key, client);
    if (!setting) {
      throw AppError.notFound('Setting key tidak ditemukan');
    }

    const before = await settingsQueries.findRoleIdsByKey(key, client);
    await settingsQueries.setRoleAccess(key, roleIds, client);

    await recordAudit(
      {
        tableName: 'setting_role_access',
        recordId: null,
        action: 'UPDATE',
        oldValue: { setting_key: key, role_ids: before },
        newValue: { setting_key: key, role_ids: roleIds },
        userId,
        actionDetail: `Akses edit setting "${key}" diubah`,
      },
      client
    );

    await client.query('COMMIT');
    return { key, editable_role_ids: roleIds };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getSetting, getSettings, listSettings, canEditSetting, updateSetting, setSettingAccess };
