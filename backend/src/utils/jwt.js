// src/utils/jwt.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Payload token sengaja minim (id, username, role) — jangan taruh data
 * sensitif di JWT karena payload bisa dibaca (base64), meski tidak
 * bisa diubah tanpa signature valid.
 */
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = { signToken, verifyToken };
