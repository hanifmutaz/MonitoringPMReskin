// src/services/roleManagementService.js
//
// Role bisa dibuat dari aplikasi (dikonfirmasi user), dengan akses granular
// per fitur lewat permission (bukan cuma label buat notifikasi). Role
// bawaan (Admin, Operator) dilindungi dari rename/delete - lihat
// migration 1700000011000 untuk alasan lengkapnya.

const db = require('../config/db');
const roleQueries = require('../sql/roleQueries');
const permissionQueries = require('../sql/permissionQueries');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');

async function listRoles() {
  const roles = await roleQueries.findAll();
  const results = [];
  for (const role of roles) {
    const permissionKeys =
      role.name === 'Admin' ? ['*'] : await permissionQueries.findPermissionKeysByRoleId(role.id);
    results.push({ ...role, permissions: permissionKeys });
  }
  return results;
}

async function listAvailablePermissions() {
  return permissionQueries.findAllPermissions();
}

async function createRole({ name, permissions }, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const existing = await roleQueries.findByName(name, client);
    if (existing) {
      throw AppError.badRequest('Validasi gagal', { name: 'Nama role sudah dipakai' });
    }

    const created = await roleQueries.create(name, client);
    await permissionQueries.setRolePermissions(created.id, permissions || [], client);

    await recordAudit(
      {
        tableName: 'roles',
        recordId: created.id,
        action: 'CREATE',
        oldValue: null,
        newValue: { ...created, permissions },
        userId,
      },
      client
    );

    await client.query('COMMIT');
    return { ...created, permissions: permissions || [] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateRole(id, { name, permissions }, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await roleQueries.findById(id, client);
    if (!before) throw AppError.notFound('Role tidak ditemukan');
    if (before.is_system) {
      throw AppError.conflict('Role bawaan (Admin/Operator) tidak bisa diubah namanya, tapi permission tetap bisa disesuaikan');
    }

    let updated = before;
    if (name !== undefined && name !== before.name) {
      const existing = await roleQueries.findByName(name, client);
      if (existing && existing.id !== id) {
        throw AppError.badRequest('Validasi gagal', { name: 'Nama role sudah dipakai' });
      }
      updated = await roleQueries.update(id, name, client);
    }

    if (permissions !== undefined) {
      await permissionQueries.setRolePermissions(id, permissions, client);
    }

    await recordAudit(
      {
        tableName: 'roles',
        recordId: id,
        action: 'UPDATE',
        oldValue: before,
        newValue: { ...updated, permissions },
        userId,
      },
      client
    );

    await client.query('COMMIT');
    return { ...updated, permissions: permissions ?? (await permissionQueries.findPermissionKeysByRoleId(id)) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update permission SAJA (dipakai buat role bawaan Admin/Operator - nama
 * tidak bisa diubah, tapi Operator boleh disesuaikan permission-nya kalau
 * Admin mau perluas/persempit akses default Operator).
 */
async function updateRolePermissions(id, permissions, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const role = await roleQueries.findById(id, client);
    if (!role) throw AppError.notFound('Role tidak ditemukan');
    if (role.name === 'Admin') {
      throw AppError.conflict('Role Admin selalu punya akses penuh (superuser), tidak perlu/tidak bisa diatur permission-nya');
    }

    const before = await permissionQueries.findPermissionKeysByRoleId(id, client);
    await permissionQueries.setRolePermissions(id, permissions, client);

    await recordAudit(
      {
        tableName: 'role_permissions',
        recordId: id,
        action: 'UPDATE',
        oldValue: { permissions: before },
        newValue: { permissions },
        userId,
        actionDetail: `Permission role "${role.name}" diubah`,
      },
      client
    );

    await client.query('COMMIT');
    return { ...role, permissions };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteRole(id, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await roleQueries.findById(id, client);
    if (!before) throw AppError.notFound('Role tidak ditemukan');
    if (before.is_system) {
      throw AppError.conflict('Role bawaan (Admin/Operator) tidak bisa dihapus');
    }

    const userCount = await roleQueries.countUsersByRole(id, client);
    if (userCount > 0) {
      throw AppError.conflict(`Role ini masih dipakai ${userCount} user, pindahkan dulu user-nya ke role lain sebelum dihapus`);
    }

    await roleQueries.remove(id, userId, client);

    await recordAudit(
      {
        tableName: 'roles',
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

module.exports = { listRoles, listAvailablePermissions, createRole, updateRole, updateRolePermissions, deleteRole };