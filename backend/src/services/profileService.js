// src/services/profileService.js
//
// Self-service profile - user ubah data DIRINYA SENDIRI. SENGAJA dipisah
// dari userManagementService.js (itu Admin-only, lewat requireRole('Admin')
// di userManagementRoutes.js) karena scope otorisasi beda total:
// userManagementService dipanggil oleh Admin yang ubah user LAIN (trusted
// actor, field lebih bebas termasuk role_id/is_active/status), sedangkan
// service ini dipanggil SIAPA PUN yang login (Operator sekalipun) buat ubah
// akunnya sendiri - jadi field yang boleh diubah HARUS dibatasi ketat di
// controller (whitelist eksplisit, lihat authController.js) supaya gak ada
// privilege escalation vector (mis. user kirim { role_id: 1 } buat naikin
// diri sendiri jadi Admin lewat body request).
//
// Field yang boleh diubah lewat sini: full_name, email. TIDAK termasuk
// username (ganti kredensial login - tetap lewat Admin/User Management biar
// ada jejak approval) atau role_id/is_active/status (privilege & status
// akun, murni domain Admin). Ganti password dipisah fungsi sendiri
// (changePassword) karena butuh verifikasi current_password dulu - beda
// alur validasi dari update profil biasa (yang gak butuh re-auth).

const bcrypt = require('bcrypt');
const db = require('../config/db');
const userQueries = require('../sql/userQueries');
const { recordAudit } = require('../utils/auditLog');
const { validatePassword } = require('../utils/passwordPolicy');
const AppError = require('../utils/AppError');

const BCRYPT_ROUNDS = 10;

/**
 * @param {number} userId
 * @param {{ full_name?: string, email?: string|null }} fields - SUDAH
 *   di-whitelist di controller (authController.updateProfile), fungsi ini
 *   gak whitelist ulang - percaya ke caller internal, konsisten sama pola
 *   userManagementService.updateUser().
 */
async function updateProfile(userId, fields) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await userQueries.findRawById(userId, client);
    if (!before) {
      throw AppError.notFound('User tidak ditemukan');
    }

    const updated = await userQueries.updateUser(userId, fields, client);

    const parts = [];
    if (fields.full_name !== undefined && fields.full_name !== before.full_name) {
      parts.push(`Nama diubah: ${before.full_name} -> ${fields.full_name}`);
    }
    if (fields.email !== undefined && fields.email !== before.email) {
      parts.push(`Email diubah: ${before.email || '(kosong)'} -> ${fields.email || '(kosong)'}`);
    }

    await recordAudit(
      {
        tableName: 'users',
        recordId: userId,
        action: 'UPDATE',
        oldValue: before,
        newValue: updated,
        userId,
        actionDetail: parts.length > 0 ? `Update profil sendiri - ${parts.join('; ')}` : 'Update profil sendiri',
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
 * Ganti password sendiri - WAJIB verifikasi current_password dulu (beda
 * dari Admin reset password user lain di userManagementService.updateUser,
 * yang gak butuh tahu password lama karena Admin memang boleh reset paksa).
 */
async function changePassword(userId, currentPassword, newPassword) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const user = await userQueries.findRawById(userId, client);
    if (!user) {
      throw AppError.notFound('User tidak ditemukan');
    }

    const passwordHash = await userQueries.findPasswordHashById(userId, client);
    const currentMatch = await bcrypt.compare(currentPassword, passwordHash);
    if (!currentMatch) {
      // Pesan spesifik ("password saat ini salah") DISENGAJA di sini -
      // beda dari login (yang generik "Username atau password salah" biar
      // gak bocorin info ke penyerang nebak username orang lain). Di sini
      // user SUDAH terautentikasi (requireAuth), jadi gak ada risiko bocor
      // info akun orang lain - kasih pesan jelas malah lebih baik buat UX.
      throw AppError.badRequest('Validasi gagal', { current_password: 'Password saat ini salah' });
    }

    const { valid, error } = validatePassword(newPassword, user.username);
    if (!valid) {
      throw AppError.badRequest('Validasi gagal', { new_password: error });
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // password_hash SENGAJA gak dikirim ke recordAudit sama sekali (bukan
    // di oldValue/newValue, bukan di actionDetail) - cukup dicatat
    // EVENT-nya doang ("password diubah"), gak perlu (dan gak boleh)
    // nyimpen hash lama/baru di audit_log walau udah di-hash.
    await userQueries.updateUser(userId, { password_hash: newHash }, client);

    await recordAudit(
      {
        tableName: 'users',
        recordId: userId,
        action: 'UPDATE',
        oldValue: null,
        newValue: null,
        userId,
        actionDetail: 'Password sendiri diubah',
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

module.exports = { updateProfile, changePassword };
