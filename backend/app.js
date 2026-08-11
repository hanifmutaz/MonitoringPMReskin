// app.js
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const crypto = require('crypto');
const env = require('./src/config/env');
const routes = require('./src/routes');
const logger = require('./src/utils/logger');
const { errorHandler, notFoundHandler } = require('./src/middlewares/errorHandler');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

app.use(
  pinoHttp({
    logger: logger.pinoInstance,
    genReqId: (req, res) => {
      const existing = req.headers['x-request-id'];
      const id = existing || crypto.randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
  })
);

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true, // wajib true supaya httpOnly cookie ikut terkirim cross-origin (frontend Vite dev server)
  })
);
// Default body-parser buat express.json() itu cuma 100kb - cukup buat
// request API biasa, TAPI ketahuan gak cukup buat POST /master-data-import/commit:
// endpoint itu ngirim balik SELURUH baris hasil parse Excel (bukan file
// mentahnya lagi - itu udah lewat multer/multipart di endpoint /preview,
// limitnya 10MB, lihat masterDataImportRoutes.js) sebagai JSON. 1 file
// Excel 22KB aja gampang jadi >100KB pas di-expand ke JSON verbose (field
// name diulang tiap baris + array errors/flag per baris), jadi ke-reject
// "request entity too large" padahal file aslinya kecil.
//
// 1mb dipilih (bukan lebih gede) karena skenario TERBESAR yang
// terdokumentasi (migrasi 1.559 baris data lama, 03_API_SPECIFICATION.md
// §4) cuma ~545KB pas di-expand ke JSON - 1mb udah ~2x headroom dari itu.
// Sengaja gak dibikin gede-gede banget (mis. 5mb) karena limit ini berlaku
// GLOBAL ke semua endpoint termasuk yang publik (/auth/login,
// /auth/register) sebelum requireAuth sempat jalan - naikin kegedean cuma
// nambah permukaan serangan availability tanpa manfaat nyata buat endpoint
// lain yang payload-nya emang kecil.
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'OK' });
});

// Serve foto profil (fitur avatar - profileService.js/authRoutes.js).
// App ini gak punya integrasi cloud storage (S3/dst) - disk lokal server,
// diserve statis dari sini. `Cross-Origin-Resource-Policy: cross-origin`
// WAJIB di-set manual - helmet() di atas default-nya "same-origin", yang
// bakal nge-block <img> dari Vite dev server (localhost:5173) muat gambar
// dari sini (localhost:4000) karena beda port dianggap origin beda oleh
// browser. Cuma di-scope ke route /uploads ini doang (bukan ubah helmet()
// secara global) - endpoint API lain tetap same-origin protected.
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;