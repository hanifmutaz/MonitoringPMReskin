// src/controllers/authController.js
const authService = require('../services/authService');
const { validateLoginBody, validateRegisterBody } = require('../validators/authValidator');
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

module.exports = { login, register, logout, me };