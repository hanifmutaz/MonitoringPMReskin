// src/services/userManagementService.js

const bcrypt = require('bcrypt');
const db = require('../config/db');
const userQueries = require('../sql/userQueries');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');

const BCRYPT_ROUNDS = 10;

async function buildUserUpdateDetail({ before, fields, passwordWasReset, client }) {
  const parts = [];

  if (fields.role_id !== undefined && fields.role_id !== before.role_id) {
    const [oldRoleName, newRoleName] = await Promise.all([
      userQueries.findRoleNameById(before.role_id, client),
      userQueries.findRoleNameById(fields.role_id, client),
    ]);
    parts.push(`Role diubah: ${oldRoleName || before.role_id} -> ${newRoleName || fields.role_id}`);
  }

  if (fields.is_active !== undefined && fields.is_active !== before.is_active) {
    parts.push(fields.is_active ? 'User diaktifkan' : 'User dinonaktifkan');
  }

  if (fields.username !== undefined && fields.username !== before.username) {
    parts.push(`Username diubah: ${before.username} -> ${fields.username}`);
  }

  if (fields.full_name !== undefined && fields.full_name !== before.full_name) {
    parts.push(`Nama diubah: ${before.full_name} -> ${fields.full_name}`);
  }

  if (passwordWasReset) {
    parts.push('Password direset');
  }

  return parts.length ? parts.join('; ') : null;
}

async function listUsers({ role, isActive, status }) {
  return userQueries.findAll({ role, isActive, status });
}

async function createUser(data, actorUserId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const roleOk = await userQueries.roleExists(data.role_id, client);
    if (!roleOk) {
      throw AppError.badRequest('Validasi gagal', { role_id: 'Role tidak ditemukan' });
    }

    const exists = await userQueries.usernameExists(data.username, client);
    if (exists) {
      throw AppError.badRequest('Validasi gagal', { username: 'Username sudah dipakai' });
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const created = await userQueries.createUser(
      { username: data.username, passwordHash, fullName: data.full_name, roleId: data.role_id, email: data.email },
      client
    );

    const roleName = await userQueries.findRoleNameById(data.role_id, client);

    // created dari RETURNING sudah TIDAK mengandung password_hash (lihat
    // userQueries.createUser) - aman langsung dipakai sebagai newValue.
    await recordAudit(
      {
        tableName: 'users',
        recordId: created.id,
        action: 'CREATE',
        oldValue: null,
        newValue: created,
        userId: actorUserId,
        actionDetail: `User baru dibuat: ${created.username} (role: ${roleName || data.role_id})`,
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

async function updateUser(id, fields, actorUserId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await userQueries.findRawById(id, client);
    if (!before) {
      throw AppError.notFound('User tidak ditemukan');
    }

    if (fields.role_id !== undefined) {
      const roleOk = await userQueries.roleExists(fields.role_id, client);
      if (!roleOk) {
        throw AppError.badRequest('Validasi gagal', { role_id: 'Role tidak ditemukan' });
      }
    }

    if (fields.username !== undefined && fields.username !== before.username) {
      const exists = await userQueries.usernameExists(fields.username, client);
      if (exists) {
        throw AppError.badRequest('Validasi gagal', { username: 'Username sudah dipakai' });
      }
    }

    const updateFields = { ...fields };
    let passwordWasReset = false;
    if (updateFields.password !== undefined) {
      updateFields.password_hash = await bcrypt.hash(updateFields.password, BCRYPT_ROUNDS);
      delete updateFields.password;
      passwordWasReset = true;
    }

    const updated = await userQueries.updateUser(id, updateFields, client);

    const actionDetail = await buildUserUpdateDetail({ before, fields, updated, passwordWasReset, client });

    await recordAudit(
      { tableName: 'users', recordId: id, action: 'UPDATE', oldValue: before, newValue: updated, userId: actorUserId, actionDetail },
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

async function approveUser(id, roleId, actorUserId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await userQueries.findRawById(id, client);
    if (!before) throw AppError.notFound('User tidak ditemukan');
    if (before.status !== 'PENDING') {
      throw AppError.conflict(`User ini sudah berstatus ${before.status}, tidak bisa di-approve lagi`);
    }

    const roleOk = await userQueries.roleExists(roleId, client);
    if (!roleOk) throw AppError.badRequest('Validasi gagal', { role_id: 'Role tidak ditemukan' });

    const updated = await userQueries.approveUser(id, roleId, actorUserId, client);
    const roleName = await userQueries.findRoleNameById(roleId, client);

    await recordAudit(
      {
        tableName: 'users',
        recordId: id,
        action: 'UPDATE',
        oldValue: before,
        newValue: updated,
        userId: actorUserId,
        actionDetail: `User di-approve, role di-assign: ${roleName || roleId}`,
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

async function rejectUser(id, actorUserId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await userQueries.findRawById(id, client);
    if (!before) throw AppError.notFound('User tidak ditemukan');
    if (before.status !== 'PENDING') {
      throw AppError.conflict(`User ini sudah berstatus ${before.status}, tidak bisa di-reject lagi`);
    }

    const updated = await userQueries.rejectUser(id, actorUserId, client);

    await recordAudit(
      {
        tableName: 'users',
        recordId: id,
        action: 'UPDATE',
        oldValue: before,
        newValue: updated,
        userId: actorUserId,
        actionDetail: 'User ditolak (rejected)',
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

module.exports = { listUsers, createUser, updateUser, approveUser, rejectUser };