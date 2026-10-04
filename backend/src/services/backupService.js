// src/services/backupService.js
//
// Backup database aplikasi, 3 format (parameter ?format=):
//   dump (default) : pg_dump -Fc, SAMA dengan perintah di README -> restore
//                    dengan `pg_restore`. Format yang direkomendasikan.
//   sql            : pg_dump plain text, bisa dibuka di text editor -> restore
//                    dengan `psql -f`.
//   xlsx           : isi SEMUA tabel sebagai sheet Excel, untuk DILIHAT/arsip.
//                    BUKAN backup yang bisa di-restore otomatis (trigger,
//                    constraint & tipe data tidak ikut). Kolom password_hash
//                    sengaja tidak diikutkan.
//
// Desain:
//  - Dump ditulis dulu ke file sementara (0600), baru dikirim ke client. Jadi
//    kalau pg_dump gagal, client dapat error JSON yang jelas (bukan file
//    setengah jadi), dan response punya Content-Length.
//  - Password DB dikirim lewat env PGPASSWORD, TIDAK lewat argumen CLI (argumen
//    kelihatan di daftar proses server).
//  - Cuma 1 backup berjalan sekaligus (409 kalau ada yang sedang jalan).
//  - Ada timeout (BACKUP_TIMEOUT_MS) supaya proses tidak menggantung.
//  - Yang dicadangkan: SELURUH isi database (termasuk akun & hash password),
//    jadi file backup harus diperlakukan sebagai data sensitif.
//  - Foto profil (volume uploads) BUKAN bagian dari dump DB - lihat README.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { URL } = require('url');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

const env = require('../config/env');
const db = require('../config/db');
const logger = require('../utils/logger');
const { buildMultiSheetXlsxBuffer, formatTimestampWib } = require('../utils/xlsxExport');
const AppError = require('../utils/AppError');
const { recordAudit } = require('../utils/auditLog');

dayjs.extend(utc);
dayjs.extend(timezone);

let running = false;

const FORMATS = {
  dump: { ext: 'dump', label: 'Dump (.dump)', contentType: 'application/octet-stream' },
  sql: { ext: 'sql', label: 'SQL (.sql)', contentType: 'application/sql; charset=utf-8' },
  xlsx: {
    ext: 'xlsx',
    label: 'Excel (.xlsx)',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
};
const DEFAULT_FORMAT = 'dump';

// Kegagalan pg_dump dilaporkan sebagai 424 (Failed Dependency), BUKAN 5xx:
// errorHandler global menyamarkan pesan 5xx jadi "Internal server error",
// padahal Admin perlu tahu apa yang harus dibereskan (pg_dump belum terpasang,
// versi tidak cocok, dst). Pesan di sini sengaja tidak memuat stderr mentah
// pg_dump / kredensial - detail lengkap hanya masuk log server.
const STATUS_DEPENDENCY_FAILED = 424;

/** Pecah DATABASE_URL jadi argumen/env untuk pg_dump (tanpa password di argv). */
function buildPgDumpInvocation(databaseUrl, outFile, format = 'dump') {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new AppError('DATABASE_URL tidak valid, backup tidak bisa dijalankan', 500);
  }
  const dbName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  // sql: --no-owner/--no-privileges supaya script bisa dijalankan oleh user DB
  // mana pun saat restore (bukan hanya pemilik aslinya).
  const formatArgs = format === 'sql' ? ['--format=plain', '--no-owner', '--no-privileges'] : ['--format=custom'];
  const args = [...formatArgs, '--no-password', '--file', outFile];
  if (url.hostname) args.push('--host', url.hostname);
  if (url.port) args.push('--port', url.port);
  if (url.username) args.push('--username', decodeURIComponent(url.username));
  args.push('--dbname', dbName);

  const childEnv = { ...process.env };
  if (url.password) childEnv.PGPASSWORD = decodeURIComponent(url.password);
  if (env.dbPool.ssl) childEnv.PGSSLMODE = env.dbPool.ssl.rejectUnauthorized ? 'verify-full' : 'require';
  return { args, env: childEnv };
}

/** Jalankan pg_dump -> file. Resolve kalau sukses, reject AppError kalau gagal. */
function runPgDump(outFile, format) {
  const { args, env: childEnv } = buildPgDumpInvocation(env.databaseUrl, outFile, format);

  return new Promise((resolve, reject) => {
    const child = spawn(env.backup.pgDumpPath, args, { env: childEnv, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      logger.error('[BACKUP] pg_dump melebihi batas waktu', { timeoutMs: env.backup.timeoutMs });
      finish(reject, new AppError('Backup dibatalkan: melebihi batas waktu', STATUS_DEPENDENCY_FAILED));
    }, env.backup.timeoutMs);

    child.stderr.on('data', (chunk) => {
      // Batasi buffer; pesan error pg_dump pendek.
      if (stderr.length < 8000) stderr += chunk.toString();
    });

    child.on('error', (err) => {
      logger.error('[BACKUP] gagal menjalankan pg_dump', err);
      if (err.code === 'ENOENT') {
        finish(
          reject,
          new AppError(
            'pg_dump tidak ditemukan di server. Pasang PostgreSQL client (versi sama dengan server DB) atau isi PG_DUMP_PATH di backend/.env.',
            STATUS_DEPENDENCY_FAILED
          )
        );
      } else {
        finish(reject, new AppError('Backup gagal dijalankan, cek log server', STATUS_DEPENDENCY_FAILED));
      }
    });

    child.on('close', (code) => {
      if (code === 0) return finish(resolve);
      logger.error('[BACKUP] pg_dump keluar dengan kode non-nol', { code, stderr: stderr.trim() });
      // Pesan versi-mismatch itu paling sering terjadi & actionable; sisanya generik.
      const hint = /server version mismatch|version mismatch/i.test(stderr)
        ? ' (versi pg_dump lebih lama dari server DB - pakai PostgreSQL client versi yang sama)'
        : '';
      return finish(reject, new AppError(`Backup gagal${hint}. Cek log server untuk detail.`, STATUS_DEPENDENCY_FAILED));
    });
  });
}

// --- Excel (semua tabel) ----------------------------------------------------

const EXCLUDED_TABLES = new Set(['pgmigrations']); // metadata tool migrasi, bukan data aplikasi
const EXCLUDED_COLUMNS = new Set(['password_hash']); // jangan bocor lewat file yang gampang dibuka
const EXCEL_CELL_MAX = 32000; // batas Excel 32.767 karakter/sel

const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;

function toCell(value, dataType) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatTimestampWib(value);
  if (typeof value === 'object') value = JSON.stringify(value); // jsonb
  if ((dataType === 'numeric' || dataType === 'bigint') && typeof value === 'string') {
    // pg mengembalikan numeric/bigint sebagai string. Jadikan angka HANYA kalau
    // aman (di bawah 2^53, tidak kehilangan presisi); selain itu biarkan teks.
    const n = Number(value);
    return Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER ? n : value;
  }
  if (typeof value === 'string' && value.length > EXCEL_CELL_MAX) return `${value.slice(0, EXCEL_CELL_MAX)}…`;
  return value;
}

/** Semua tabel public -> workbook. Snapshot konsisten (REPEATABLE READ, read-only). */
async function buildExcelBackup() {
  const maxRows = env.backup.excelMaxRowsPerTable;
  const client = await db.getClient();
  const sheets = [];
  const info = [];
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');

    const tablesRes = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
    );
    const tables = tablesRes.rows.map((r) => r.table_name).filter((t) => !EXCLUDED_TABLES.has(t));

    for (const table of tables) {
      const colsRes = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
        [table]
      );
      const cols = colsRes.rows.filter((c) => !EXCLUDED_COLUMNS.has(c.column_name));
      if (cols.length === 0) continue;

      const total = (await client.query(`SELECT COUNT(*)::bigint AS n FROM ${quoteIdent(table)}`)).rows[0].n;
      const totalN = Number(total);
      const truncated = totalN > maxRows;
      const hasId = cols.some((c) => c.column_name === 'id');
      const colList = cols.map((c) => quoteIdent(c.column_name)).join(', ');

      // Kalau dipotong, pertahankan baris TERBARU (id terbesar), lalu urutkan naik lagi.
      const sql = hasId
        ? truncated
          ? `SELECT * FROM (SELECT ${colList} FROM ${quoteIdent(table)} ORDER BY id DESC LIMIT ${maxRows}) t ORDER BY id ASC`
          : `SELECT ${colList} FROM ${quoteIdent(table)} ORDER BY id ASC`
        : `SELECT ${colList} FROM ${quoteIdent(table)} LIMIT ${maxRows}`;
      const rowsRes = await client.query({ text: sql, rowMode: 'array' });

      sheets.push({
        name: table,
        header: cols.map((c) => c.column_name),
        rows: rowsRes.rows.map((row) => row.map((v, i) => toCell(v, cols[i].data_type))),
      });
      info.push([table, totalN, rowsRes.rows.length, truncated ? 'DIPOTONG (hanya baris terbaru)' : 'lengkap']);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  const infoSheet = {
    name: '_INFO',
    header: ['Tabel', 'Total baris di DB', 'Baris di file ini', 'Keterangan'],
    widths: [30, 18, 18, 34],
    rows: [
      ...info,
      [],
      ['Dibuat (WIB)', formatTimestampWib(new Date())],
      ['CATATAN', 'File ini untuk DILIHAT/arsip, BUKAN backup yang bisa di-restore otomatis. Untuk restore pakai backup .dump atau .sql.'],
      ['CATATAN', 'Kolom password_hash (tabel users) tidak diikutkan.'],
      ['CATATAN', `Maksimal ${maxRows.toLocaleString('id-ID')} baris per tabel (BACKUP_EXCEL_MAX_ROWS).`],
    ],
  };
  return buildMultiSheetXlsxBuffer([infoSheet, ...sheets]);
}

/** Tulis backup sesuai format ke outFile. */
async function writeBackupFile(format, outFile) {
  if (format === 'xlsx') {
    await fs.promises.writeFile(outFile, await buildExcelBackup(), { mode: 0o600 });
  } else {
    await runPgDump(outFile, format);
  }
}

/**
 * Buat backup & kirim sebagai download. Dipanggil dari controller.
 * @param {import('express').Response} res
 * @param {{id:number}} user
 * @param {'dump'|'sql'|'xlsx'} [format]
 */
async function createAndSendBackup(res, user, format = DEFAULT_FORMAT) {
  const fmt = FORMATS[format];
  if (!fmt) throw new AppError('Format backup tidak dikenal', 400, { format: `Pilih salah satu: ${Object.keys(FORMATS).join(', ')}` });
  if (running) throw new AppError('Backup lain sedang berjalan, coba lagi sebentar', 409);
  running = true;

  const filename = `pm-monitoring-backup-${dayjs().tz('Asia/Jakarta').format('YYYYMMDD-HHmm')}.${fmt.ext}`;
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pm-backup-'));
  const tmpFile = path.join(tmpDir, filename);

  const cleanup = async () => {
    running = false;
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  };

  try {
    await writeBackupFile(format, tmpFile);
    const { size } = await fs.promises.stat(tmpFile);

    await recordAudit({
      tableName: 'backup',
      recordId: null,
      action: 'CREATE',
      userId: user.id,
      actionDetail: `Backup database diunduh - ${fmt.label} (${filename}, ${(size / 1024 / 1024).toFixed(2)} MB)`,
    });
    logger.info('[BACKUP] backup database dibuat', { filename, format, size, userId: user.id });

    res.setHeader('Content-Type', fmt.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(size));
    res.setHeader('Cache-Control', 'no-store');

    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(tmpFile);
      stream.on('error', reject);
      res.on('close', resolve); // selesai ATAU client memutus koneksi
      stream.pipe(res);
    });
  } finally {
    await cleanup();
  }
}

module.exports = { createAndSendBackup, buildPgDumpInvocation, FORMATS, DEFAULT_FORMAT };
