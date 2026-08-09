// src/utils/mailer.js
//
// Wrapper tipis di atas nodemailer. Kredensial SMTP TIDAK wajib di-set (lihat
// src/config/env.js) - kalau kosong, sendMail() cuma log warning & skip,
// TIDAK melempar error yang bisa bikin job/request lain ikut gagal.

const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('./logger');

let transporter = null;

function getTransporter() {
  if (!env.smtp.host || !env.smtp.user) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.password },
    });
  }
  return transporter;
}

/**
 * @param {{ to: string[], subject: string, html: string }} params
 * @returns {{ skipped: boolean }} skipped=true kalau SMTP belum dikonfigurasi
 */
async function sendMail({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    logger.warn(`SMTP belum dikonfigurasi (SMTP_HOST/SMTP_USER kosong) - email "${subject}" tidak dikirim`);
    return { skipped: true };
  }
  await t.sendMail({ from: env.smtp.from, to: to.join(','), subject, html });
  return { skipped: false };
}

module.exports = { sendMail };
