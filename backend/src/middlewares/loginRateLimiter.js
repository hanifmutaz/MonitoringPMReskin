// src/middlewares/loginRateLimiter.js
//
// Development Rules §21 mewajibkan "Rate limit login". `express-rate-limit`
// dipakai di sini sebagai SATU-SATUNYA dependency tambahan di luar daftar
// stack yang sudah dikunci — ditambahkan dengan alasan eksplisit (bukan
// improvisasi) karena §21 secara spesifik mensyaratkan ini dan menulis
// rate limiter custom sendiri untuk kebutuhan ini akan melanggar prinsip
// KISS (Development Rules §2) tanpa manfaat nyata dibanding pakai library
// battle-tested untuk hal sesederhana ini.

const rateLimit = require('express-rate-limit');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // maksimal 10 percobaan login per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
});

module.exports = loginRateLimiter;
