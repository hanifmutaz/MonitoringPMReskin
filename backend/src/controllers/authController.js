// src/controllers/authController.js
const authService = require('../services/authService');
const profileService = require('../services/profileService');
const { validateLoginBody, validateRegisterBody, validateUpdateProfileBody, validateChangePasswordBody } = require('../validators/authValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const env = require('../config/env');

const COOKIE_NAME = 'token';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000, // 8 jam, selaras dengan JWT_EXPIRES_IN default
  };
}

const login = asyncHandler(async (req, res) => {
  const { valid, errors } = validateLoginBody(req.body);
  if (!valid) {
    throw AppError.badRequest('Validasi gagal', errors);
  }

  const { username, password } = req.body;
  const context = { ip: req.ip, userAgent: req.get('user-agent') };
  const { token, user } = await authService.login(username, password, context);

  res.cookie(COOKIE_NAME, token, cookieOptions());

  res.status(200).json({
    success: true,
    message: 'Success',
    data: { user },
  });
});

const register = asyncHandler(async (req, res) => {
  const { valid, errors } = validateRegisterBody(req.body);
  if (!valid) {
    throw AppError.badRequest('Validasi gagal', errors);
  }

  const { username, password, full_name, email } = req.body;
  const created = await authService.register({ username, password, full_name, email });

  // TIDAK ada cookie/token di sini dengan sengaja - status masih PENDING,
  // belum boleh login sampai Admin approve.
  res.status(201).json({
    success: true,
    message: 'Registrasi berhasil. Akun Anda menunggu persetujuan Admin sebelum bisa login.',
    data: { id: created.id, username: created.username, status: created.status },
  });
});

const logout = asyncHandler(async (req, res) => {
  const context = { ip: req.ip, userAgent: req.get('user-agent') };
  await authService.logout(req.user.username, req.user.id, context);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.status(200).json({ success: true, message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.status(200).json({ success: true, message: 'Success', data: user });
});

/**
 * PATCH /auth/me - update profil sendiri (full_name & email doang).
 * Whitelist DILAKUKAN DI SINI juga (bukan cuma validator) - defense in
 * depth. Endpoint ini kebuka buat SEMUA role yang login (bukan Admin-only
 * kayak PATCH /users/:id), jadi field yang diteruskan ke service HARUS
 * eksplisit dipilih, gak boleh sekadar spread `...req.body` (itu pola yang
 * dipakai userManagementController.update - AMAN di situ karena
 * route-nya di-gate requireRole('Admin') dulu, jadi actor-nya trusted;
 * TIDAK aman kalau ditiru di sini).
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { valid, errors } = validateUpdateProfileBody(req.body);
  if (!valid) {
    throw AppError.badRequest('Validasi gagal', errors);
  }

  const fields = {};
  if (req.body.full_name !== undefined) fields.full_name = req.body.full_name;
  if (req.body.email !== undefined) fields.email = req.body.email;

  const data = await profileService.updateProfile(req.user.id, fields);
  res.status(200).json({ success: true, message: 'Profil berhasil diubah', data });
});

/**
 * PATCH /auth/me/password - ganti password sendiri, butuh current_password.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { valid, errors } = validateChangePasswordBody(req.body);
  if (!valid) {
    throw AppError.badRequest('Validasi gagal', errors);
  }

  await profileService.changePassword(req.user.id, req.body.current_password, req.body.new_password);
  res.status(200).json({ success: true, message: 'Password berhasil diubah' });
});

/**
 * POST /auth/me/avatar - upload/ganti foto profil sendiri. `req.file` dari
 * multer (lihat authRoutes.js - handleAvatarUpload wrapper).
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('Validasi gagal', { avatar: 'File wajib diupload' });
  }

  const avatarUrl = await profileService.updateAvatar(req.user.id, req.file);
  res.status(200).json({ success: true, message: 'Foto profil berhasil diubah', data: { avatar_url: avatarUrl } });
});

/**
 * DELETE /auth/me/avatar - hapus foto profil sendiri (balik ke fallback
 * inisial).
 */
const deleteAvatar = asyncHandler(async (req, res) => {
  await profileService.removeAvatar(req.user.id);
  res.status(200).json({ success: true, message: 'Foto profil dihapus' });
});

module.exports = { login, register, logout, me, updateProfile, changePassword, uploadAvatar, deleteAvatar };