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
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const userQueries = require('../sql/userQueries');
const { recordAudit } = require('../utils/auditLog');
const { validatePassword } = require('../utils/passwordPolicy');
const AppError = require('../utils/AppError');

const BCRYPT_ROUNDS = 10;

// Foto profil OPSIONAL (user boleh gak pernah upload sama sekali, avatar_url
// tetap NULL - lihat migration 1700000016000). Disk lokal (bukan cloud
// storage - app ini gak punya integrasi S3/dst di config manapun), diserve
// statis lewat app.js. Nama file di-generate RANDOM (userId + random hex),
// SENGAJA gak pakai originalname dari user - originalname gak boleh
// dipercaya jadi bagian path/filename (path traversal risk kalau ada
// karakter aneh kayak "../../etc/passwd.jpg").
const AVATAR_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');
const ALLOWED_AVATAR_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB - foto profil, bukan dokumen/Excel

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

/**
 * Upload/ganti foto profil sendiri. `file` = objek dari multer
 * (memoryStorage: { buffer, mimetype, size, ... }).
 */
async function updateAvatar(userId, file) {
  if (!ALLOWED_AVATAR_MIME[file.mimetype]) {
    throw AppError.badRequest('Validasi gagal', { avatar: 'Format harus JPG, PNG, atau WebP' });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw AppError.badRequest('Validasi gagal', { avatar: `Ukuran file maksimal ${MAX_AVATAR_BYTES / (1024 * 1024)}MB` });
  }

  fs.mkdirSync(AVATAR_DIR, { recursive: true });
  const ext = ALLOWED_AVATAR_MIME[file.mimetype];
  const filename = `${userId}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const filePath = path.join(AVATAR_DIR, filename);
  // Tulis file KE DISK DULU, sebelum transaksi DB - kalau DB gagal, file
  // yang baru ditulis ini yang di-bersihin (lihat catch di bawah), bukan
  // sebaliknya (DB berhasil tapi file gak ada).
  fs.writeFileSync(filePath, file.buffer);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await userQueries.findRawById(userId, client);
    if (!before) {
      throw AppError.notFound('User tidak ditemukan');
    }

    const avatarUrl = `/uploads/avatars/${filename}`;
    await userQueries.updateUser(userId, { avatar_url: avatarUrl }, client);

    await recordAudit(
      {
        tableName: 'users',
        recordId: userId,
        action: 'UPDATE',
        oldValue: { avatar_url: before.avatar_url },
        newValue: { avatar_url: avatarUrl },
        userId,
        actionDetail: 'Foto profil diubah',
      },
      client
    );

    await client.query('COMMIT');

    // File avatar LAMA (kalau ada) dihapus SETELAH commit sukses, best-
    // effort (gak throw kalau gagal hapus - itu bukan alasan buat gagalin
    // keseluruhan request, cukup jadi file yatim di disk yang gak
    // berbahaya, cuma makan sedikit storage).
    if (before.avatar_url) {
      const oldPath = path.join(AVATAR_DIR, path.basename(before.avatar_url));
      fs.unlink(oldPath, () => {});
    }

    return avatarUrl;
  } catch (err) {
    await client.query('ROLLBACK');
    // DB gagal - file yang BARU ditulis di atas jadi yatim, bersihin biar
    // gak numpuk.
    fs.unlink(filePath, () => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Hapus foto profil sendiri (balik ke fallback inisial di frontend).
 * Idempotent - manggil ini pas avatar_url udah NULL bukan error, no-op.
 */
async function removeAvatar(userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const before = await userQueries.findRawById(userId, client);
    if (!before) {
      throw AppError.notFound('User tidak ditemukan');
    }
    if (!before.avatar_url) {
      await client.query('ROLLBACK');
      return;
    }

    await userQueries.updateUser(userId, { avatar_url: null }, client);

    await recordAudit(
      {
        tableName: 'users',
        recordId: userId,
        action: 'UPDATE',
        oldValue: { avatar_url: before.avatar_url },
        newValue: { avatar_url: null },
        userId,
        actionDetail: 'Foto profil dihapus',
      },
      client
    );

    await client.query('COMMIT');

    const oldPath = path.join(AVATAR_DIR, path.basename(before.avatar_url));
    fs.unlink(oldPath, () => {});
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { updateProfile, changePassword, updateAvatar, removeAvatar };
