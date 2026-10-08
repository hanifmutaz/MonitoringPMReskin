// src/services/masterDataImportService.js
//
// Import Master Data dari Excel (sheet "MasterData": No, Line No, CL No,
// Product Name, Jig Name, Drawing No., Part Name, Target Shot, Pemakaian/Hari)
//
// ALUR (hasil diskusi Q11 & Q12):
//   1. preview()  - parse + validasi SEMUA baris (TIDAK sentuh DB sama
//      sekali). Baris valid/warning/error ditandai, tapi tetap dikembalikan
//      semua (bukan skip diam-diam) supaya Admin bisa review & koreksi di UI.
//   2. Admin review hasil preview di frontend, boleh edit field per baris
//      (terutama Drawing No hasil auto-clean), boleh uncheck baris yang
//      tidak mau diimport.
//   3. commit() - baru insert/update ke database. Baris yang gagal saat
//      commit (row_errors) TIDAK menggagalkan baris lain (per-row SAVEPOINT)
//      - pendekatan hybrid sesuai kesepakatan Q11: bukan all-or-nothing,
//      bukan juga skip diam-diam tanpa laporan.
//
// CATATAN PENTING:
//   - Kolom "Pemakaian/Hari" di Excel TIDAK disimpan ke database. Sistem
//     menghitung Pemakaian/Hari secara DINAMIS dari data actual sync ConMas
//     (lihat pmPartService.computeMetrics: usage_per_day = counter /
//     daysSinceInstall), bukan dari angka statis Master Data. Kolom ini
//     hanya ditampilkan di preview sebagai referensi, lalu diabaikan saat
//     commit — lihat field `ignored_columns` di hasil preview().
//   - Drawing No di-auto-clean (buang suffix " A"/" B"/dst di akhir teks)
//     karena identitas unik part sekarang (line_id, jig_name, drawing_no)
//     - lihat migration 1700000006000. Suffix manual itu jadi redundant
//     dengan kolom Jig Name yang sudah ada terpisah. Hasil auto-clean
//     ditandai `drawing_no_auto_cleaned: true` dan WAJIB direview Admin
//     sebelum commit (Q "Preview dulu ... Admin bisa koreksi manual").
//   - Line yang belum ada di Master Data OTOMATIS DIBUAT saat commit - ini
//     BEDA dengan sync ConMas (conmasSyncService) yang sengaja skip Line
//     asing. Di sini kita memang SEDANG membangun Master Data dari nol,
//     jadi auto-create Line adalah perilaku yang diinginkan, bukan bug.

const xlsx = require('xlsx');
const db = require('../config/db');
const lineQueries = require('../sql/lineQueries');
const partQueries = require('../sql/partQueries');
const clMappingQueries = require('../sql/clMappingQueries');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');
const dateUtils = require('../utils/dateUtils');

const HEADER_ALIASES = {
  line_no: ['line no', 'line no.', 'line'],
  cl_no: ['cl no', 'cl no.', 'cl'],
  product_name: ['product name'],
  jig_name: ['jig name', 'jig'],
  drawing_no: ['drawing no', 'drawing no.'],
  part_name: ['part name'],
  target_shot: ['target shot'],
  pemakaian_hari: ['pemakaian/hari', 'pemakaian hari', 'pemakaian per hari'],
  // Baseline buat Part yang belum pernah punya riwayat penggantian, lihat
  // migration 1700000025000 & pmPartQueries.js. Bukan bagian requiredCols
  // (kolomnya boleh tidak ada di file), tapi WAJIB terisi per baris untuk Part
  // BARU - dicek di parsePreview (status error) dan di commitImport.
  tgl_pasang_awal: ['tanggal pasang awal', 'tgl pasang awal', 'tanggal pasang', 'install date', 'installation date'],
  // Posisi shot awal saat mulai monitoring (migration 1700000026000). Selalu
  // berpasangan: Counter Awal = shot terpakai per AKHIR HARI Tanggal Counter
  // Awal; produksi dihitung otomatis mulai hari sesudahnya. Opsional di file.
  counter_awal: ['counter awal', 'shot awal', 'counter awal (shot)'],
  counter_awal_tanggal: ['tanggal counter awal', 'tgl counter awal', 'counter awal tanggal', 'tanggal cutoff'],
};

// Cek tanggal kalender beneran ada (tolak 2026-02-31 dst) tanpa Date lokal.
function isRealDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Excel biasa nyimpen tanggal sebagai serial number (bukan string) kalau sel-nya
// diformat sebagai Date - xlsx.utils.sheet_to_json({raw:true}) balikin serial
// number itu apa adanya. Konversi ke 'YYYY-MM-DD' pakai epoch Excel (1899-12-30),
// atau terima langsung kalau sel-nya berupa teks 'YYYY-MM-DD' / 'DD/MM/YYYY'.
const MONTH_ABBR = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7, aug: 8, agu: 8, agt: 8,
  sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12,
};

function parseExcelDateCell(value) {
  if (value === null || value === undefined || value === '') return null;
  // Jaga-jaga kalau sel datang sebagai objek Date (mis. dibaca dengan cellDates).
  // Pakai komponen UTC supaya tidak geser hari karena timezone server.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getTime() + 12 * 3600 * 1000).toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const utcDays = Math.floor(value - 25569); // 25569 = hari antara 1899-12-30 dan 1970-01-01
    const utcMs = utcDays * 86400 * 1000;
    return new Date(utcMs).toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  if (!str) return null;
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return isRealDate(match[0]) ? match[0] : null;
  const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return isRealDate(iso) ? iso : null;
  }
  // Teks 'DD-Mon-YYYY' / 'DD Mon YYYY' (mis. '28-Sep-2026', '5 Agu 2026'), nama bulan Inggris/Indonesia.
  const dmon = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,4})[-/ ,]*(\d{4})$/);
  if (dmon) {
    const [, d, mon, y] = dmon;
    const m = MONTH_ABBR[mon.slice(0, 3).toLowerCase()];
    if (m) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${d.padStart(2, '0')}`;
      return isRealDate(iso) ? iso : null;
    }
  }
  return null; // tidak dikenali / tanggal ngawur - caller (parsePreview) yang nge-flag jadi error baris
}

// Validasi otoritatif di server sebelum Tanggal Pasang Awal ditulis ke DB
// (client bisa ngirim baris hasil edit). Dipakai di jalur create & update.
function assertValidTglPasang(tgl) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl) || !isRealDate(tgl)) {
    throw new Error('Tanggal Pasang Awal tidak valid (harus YYYY-MM-DD)');
  }
  if (tgl > dateUtils.todayString()) {
    throw new Error('Tanggal Pasang Awal tidak boleh di masa depan');
  }
}

// Validasi otoritatif di server buat pasangan Counter Awal (jalur create & update).
function assertValidCounterAwal(counterAwal, tanggal) {
  if (!Number.isInteger(counterAwal) || counterAwal < 0) {
    throw new Error('Counter Awal harus bilangan bulat >= 0');
  }
  if (typeof tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !isRealDate(tanggal)) {
    throw new Error('Tanggal Counter Awal tidak valid (harus YYYY-MM-DD)');
  }
  if (tanggal > dateUtils.todayString()) {
    throw new Error('Tanggal Counter Awal tidak boleh di masa depan');
  }
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildColumnMap(headerRow) {
  const map = {};
  (headerRow || []).forEach((raw, idx) => {
    const norm = normalizeHeader(raw);
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm)) {
        map[key] = idx;
      }
    }
  });
  return map;
}

/**
 * Buang suffix manual " A" / " B" / dst di akhir Drawing No (1 huruf,
 * didahului spasi). Lihat catatan migration 1700000006000 - suffix ini
 * dulu dipakai buat "akalin" constraint unique lama sebelum ada kolom
 * jig_name terpisah.
 */
function autoCleanDrawingNo(raw) {
  const trimmed = String(raw ?? '').trim();
  const cleaned = trimmed.replace(/\s+[A-Za-z]$/, '').trim();
  return { original: trimmed, cleaned, wasAutoCleaned: cleaned !== trimmed && cleaned !== '' };
}

/**
 * Parse buffer Excel -> daftar baris siap direview Admin. Murni in-memory,
 * TIDAK ada write ke database (SELECT-only, buat cross-check existing data).
 */
async function parsePreview(fileBuffer) {
  let workbook;
  try {
    workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: false });
  } catch {
    throw AppError.badRequest('File tidak bisa dibaca', { _general: 'Pastikan file berformat .xlsx/.xlsm yang valid' });
  }

  const sheetName = workbook.SheetNames.includes('MasterData') ? 'MasterData' : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  // Header bisa ada di baris ke-2 dst (baris 1 sering dipakai buat judul
  // sheet, lihat contoh file SparePart.xlsm), makanya cari di 10 baris awal.
  let headerIdx = -1;
  let colMap = {};
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const candidate = buildColumnMap(rawRows[i] || []);
    if (candidate.line_no !== undefined && candidate.drawing_no !== undefined) {
      headerIdx = i;
      colMap = candidate;
      break;
    }
  }
  if (headerIdx === -1) {
    throw AppError.badRequest('Format file tidak dikenali', {
      _general: 'Baris header (Line No, Drawing No, dst) tidak ditemukan di 10 baris pertama sheet "' + sheetName + '"',
    });
  }

  const requiredCols = ['line_no', 'cl_no', 'jig_name', 'drawing_no', 'part_name', 'target_shot'];
  const missingCols = requiredCols.filter((c) => colMap[c] === undefined);
  if (missingCols.length > 0) {
    throw AppError.badRequest('Format file tidak lengkap', {
      _general: `Kolom wajib tidak ditemukan: ${missingCols.join(', ')}`,
    });
  }

  const dataRows = rawRows
    .slice(headerIdx + 1)
    .filter((r) => r && r.some((cell) => cell !== null && cell !== ''));

  const parsedRows = dataRows.map((r, i) => {
    const lineNo = String(r[colMap.line_no] ?? '').trim();
    const clNo = String(r[colMap.cl_no] ?? '').trim();
    const productName = colMap.product_name !== undefined ? String(r[colMap.product_name] ?? '').trim() : '';
    const jigName = String(r[colMap.jig_name] ?? '').trim();
    const partName = String(r[colMap.part_name] ?? '').trim();
    const targetShotRaw = r[colMap.target_shot];
    const targetShot = Number(targetShotRaw);
    const pemakaianHariExcel = colMap.pemakaian_hari !== undefined ? r[colMap.pemakaian_hari] : null;
    const tglPasangAwalRaw = colMap.tgl_pasang_awal !== undefined ? r[colMap.tgl_pasang_awal] : null;
    const tglPasangAwal = parseExcelDateCell(tglPasangAwalRaw);
    const counterAwalRaw = colMap.counter_awal !== undefined ? r[colMap.counter_awal] : null;
    const counterAwalTglRaw = colMap.counter_awal_tanggal !== undefined ? r[colMap.counter_awal_tanggal] : null;
    const counterAwalFilled = counterAwalRaw !== null && counterAwalRaw !== undefined && String(counterAwalRaw).trim() !== '';
    const counterAwalNum = counterAwalFilled ? Number(String(counterAwalRaw).replace(/[.,\s]/g, '')) : null;
    const counterAwalTgl = parseExcelDateCell(counterAwalTglRaw);
    const counterAwalTglFilled =
      counterAwalTglRaw !== null && counterAwalTglRaw !== undefined && String(counterAwalTglRaw).trim() !== '';

    const { original, cleaned, wasAutoCleaned } = autoCleanDrawingNo(r[colMap.drawing_no]);

    const errors = [];
    if (!lineNo) errors.push('Line No kosong');
    if (!clNo) errors.push('CL No kosong');
    if (!jigName) errors.push('Jig Name kosong');
    if (!cleaned) errors.push('Drawing No kosong');
    if (!partName) errors.push('Part Name kosong');
    if (!Number.isFinite(targetShot) || targetShot <= 0) errors.push('Target Shot harus angka > 0');
    const tglRawFilled = tglPasangAwalRaw !== null && tglPasangAwalRaw !== undefined && String(tglPasangAwalRaw).trim() !== '';
    if (tglRawFilled && !tglPasangAwal) {
      errors.push('Tanggal Pasang Awal tidak valid (pakai YYYY-MM-DD atau DD/MM/YYYY)');
    } else if (tglPasangAwal && tglPasangAwal > dateUtils.todayString()) {
      errors.push('Tanggal Pasang Awal tidak boleh di masa depan');
    }
    if (counterAwalFilled && (!Number.isInteger(counterAwalNum) || counterAwalNum < 0)) {
      errors.push('Counter Awal harus bilangan bulat >= 0');
    }
    if (counterAwalTglFilled && !counterAwalTgl) {
      errors.push('Tanggal Counter Awal tidak valid (pakai YYYY-MM-DD atau DD/MM/YYYY)');
    } else if (counterAwalTgl && counterAwalTgl > dateUtils.todayString()) {
      errors.push('Tanggal Counter Awal tidak boleh di masa depan');
    }

    return {
      row_number: headerIdx + 2 + i, // nomor baris asli Excel (1-based + header)
      line_no: lineNo,
      cl_no: clNo,
      product_name: productName || null,
      jig_name: jigName,
      drawing_no_original: original,
      drawing_no: cleaned,
      drawing_no_auto_cleaned: wasAutoCleaned,
      part_name: partName,
      target_shot: Number.isFinite(targetShot) ? targetShot : null,
      pemakaian_hari_excel: pemakaianHariExcel,
      tgl_pasang_awal: tglPasangAwal,
      counter_awal: counterAwalFilled && Number.isInteger(counterAwalNum) ? counterAwalNum : null,
      counter_awal_tanggal: counterAwalTgl,
      errors,
    };
  });

  // Duplikat PERSIS SAMA dalam file (baris Line+Jig+Drawing+CL identik)
  const seenMapping = new Map();
  for (const row of parsedRows) {
    if (row.errors.length > 0) continue;
    const key = `${row.line_no}|${row.jig_name}|${row.drawing_no}|${row.cl_no}`;
    if (seenMapping.has(key)) {
      row.errors.push(`Duplikat baris ${seenMapping.get(key)} (Line+Jig+Drawing+CL sama persis)`);
    } else {
      seenMapping.set(key, row.row_number);
    }
  }

  // Part_name / Target Shot HARUS konsisten untuk (Line+Jig+Drawing) yang
  // sama, karena itu semua merujuk ke 1 unit Part fisik yang sama.
  const partGroups = new Map();
  for (const row of parsedRows) {
    if (row.errors.length > 0) continue;
    const key = `${row.line_no}|${row.jig_name}|${row.drawing_no}`;
    if (!partGroups.has(key)) partGroups.set(key, []);
    partGroups.get(key).push(row);
  }
  for (const groupRows of partGroups.values()) {
    const distinctNames = new Set(groupRows.map((r) => r.part_name));
    const distinctShots = new Set(groupRows.map((r) => r.target_shot));
    // tgl_pasang_awal: cuma bandingin baris yang ADA isinya (banyak baris CL
    // wajar kosong semua kalau kolomnya emang gak diisi Admin) - beda dari
    // Part Name/Target Shot yang harus selalu ada isinya.
    const distinctTglPasang = new Set(groupRows.map((r) => r.tgl_pasang_awal).filter(Boolean));
    if (distinctTglPasang.size === 1) {
      // 1 Part bisa muncul di banyak baris CL - cukup 1 baris yang ngisi tanggal,
      // baris lain di Part yang sama otomatis ikut (biar wajib-isi tidak
      // nuntut tanggal yang sama diketik berulang di tiap baris CL).
      const [onlyDate] = distinctTglPasang;
      for (const r of groupRows) r.tgl_pasang_awal = onlyDate;
    }
    // Counter Awal + tanggalnya: 1 nilai per Part fisik, sama pola dengan
    // tgl_pasang_awal (cuma 1 baris CL yang perlu ngisi, sisanya ikut). Angka 0
    // adalah nilai sah, jadi cek pakai != null (bukan truthy).
    const distinctCounterAwal = new Set(groupRows.map((r) => r.counter_awal).filter((v) => v !== null));
    const distinctCounterTgl = new Set(groupRows.map((r) => r.counter_awal_tanggal).filter(Boolean));
    if (distinctCounterAwal.size === 1) {
      const [onlyVal] = distinctCounterAwal;
      for (const r of groupRows) r.counter_awal = onlyVal;
    }
    if (distinctCounterTgl.size === 1) {
      const [onlyTgl] = distinctCounterTgl;
      for (const r of groupRows) r.counter_awal_tanggal = onlyTgl;
    }
    if (distinctCounterAwal.size > 1 || distinctCounterTgl.size > 1) {
      const rowNums = groupRows.map((r) => r.row_number).join(', ');
      for (const r of groupRows) {
        r.errors.push(
          `Counter Awal/Tanggal Counter Awal tidak konsisten untuk Drawing No yang sama (baris: ${rowNums}) - samakan dulu sebelum commit`
        );
      }
    } else if ((distinctCounterAwal.size === 1) !== (distinctCounterTgl.size === 1)) {
      // Harus berpasangan: angka tanpa tanggal cutoff (atau sebaliknya) tidak bisa dipakai.
      for (const r of groupRows) {
        r.errors.push('Counter Awal dan Tanggal Counter Awal harus diisi berpasangan');
      }
    }
    if (distinctNames.size > 1 || distinctShots.size > 1 || distinctTglPasang.size > 1) {
      const rowNums = groupRows.map((r) => r.row_number).join(', ');
      for (const r of groupRows) {
        r.errors.push(
          `Part Name/Target Shot/Tanggal Pasang Awal tidak konsisten untuk Drawing No yang sama (baris: ${rowNums}) - samakan dulu sebelum commit`
        );
      }
    }
  }

  // Cross-check ke DB - biar Admin tahu mana yang bakal jadi Line/Part BARU
  // vs mana yang cuma nambah CL Mapping ke Part yang sudah ada.
  const existingLines = await lineQueries.findAll({});
  const lineMap = new Map(existingLines.map((l) => [l.line_name, l.id]));
  // Line di Recycle Bin (nama sama) yang masih punya Part - jangan dibuat ulang diam-diam.
  const deletedLineMap = new Map((await lineQueries.findDeletedWithParts()).map((l) => [l.line_name, l]));

  for (const row of parsedRows) {
    if (row.errors.length > 0) {
      row.status = 'error';
      row.line_exists = false;
      row.part_exists = false;
      continue;
    }
    const lineId = lineMap.get(row.line_no);
    const binLine = !lineId ? deletedLineMap.get(row.line_no) : null;
    if (binLine) {
      row.line_exists = false;
      row.part_exists = false;
      row.errors.push(
        `Line "${row.line_no}" ada di Recycle Bin dengan ${binLine.part_count} Part. Restore Line itu dulu (Recycle Bin), atau pakai nama Line lain - kalau tidak, Part lama dan Part import terpisah di dua Line.`
      );
      row.status = 'error';
      continue;
    }
    row.line_exists = !!lineId;
    row.part_exists = false;
    row.existing_tgl_pasang_awal = null; // tanggal yang SAAT INI tersimpan di sistem (buat info di preview)
    row.existing_counter_awal = null; // Counter Awal yang SAAT INI tersimpan (null = belum ada)
    row.existing_counter_awal_tanggal = null;
    if (lineId) {
      const existingPart = await partQueries.findByLineJigAndDrawing(lineId, row.jig_name, row.drawing_no);
      row.part_exists = !!existingPart;
      row.existing_tgl_pasang_awal = (existingPart && existingPart.tgl_pasang_awal) || null;
      if (existingPart && existingPart.counter_awal_tanggal) {
        row.existing_counter_awal = Number(existingPart.counter_awal);
        row.existing_counter_awal_tanggal = existingPart.counter_awal_tanggal;
      }
    }
    const punyaCounterAwal = row.counter_awal !== null && !!row.counter_awal_tanggal;
    if (!row.part_exists && !row.tgl_pasang_awal && !punyaCounterAwal) {
      row.errors.push('Part baru wajib punya Tanggal Pasang Awal, atau Counter Awal + Tanggal Counter Awal');
      row.status = 'error';
      continue;
    }
    row.status = row.drawing_no_auto_cleaned ? 'warning' : 'valid';
  }

  const summary = {
    total_rows: parsedRows.length,
    valid: parsedRows.filter((r) => r.status === 'valid').length,
    warning: parsedRows.filter((r) => r.status === 'warning').length,
    error: parsedRows.filter((r) => r.status === 'error').length,
  };

  return {
    sheet_used: sheetName,
    summary,
    rows: parsedRows,
    ignored_columns:
      colMap.pemakaian_hari !== undefined
        ? ['Pemakaian/Hari - dihitung otomatis oleh sistem dari data actual sync ConMas, kolom ini diabaikan saat commit']
        : [],
  };
}

/**
 * Commit hasil import yang sudah direview/dikoreksi Admin di preview.
 * `rows` di sini adalah hasil EDIT-AN Admin (bukan hasil mentah preview).
 * Baris dengan `include: false` dilewati (Admin uncheck di UI). Baris yang
 * gagal saat commit (row_errors) TIDAK menggagalkan baris lain — dijaga
 * pakai SAVEPOINT per baris di dalam 1 transaksi besar.
 *
 * Tanggal Pasang Awal untuk Part yang SUDAH ada: default cuma diisi kalau di
 * sistem masih kosong (baseline yang sudah ada tidak dirusak import ulang
 * file lama). Kalau `overwriteTglPasang` true, tanggal dari Excel juga
 * menimpa tanggal yang sudah tersimpan (hanya baris yang tanggalnya beda).
 *
 * Counter Awal (+ tanggalnya) untuk Part yang SUDAH ada: pola sama - default
 * cuma diisi kalau di sistem masih kosong; `overwriteCounterAwal` true buat
 * menimpa pasangan yang sudah tersimpan kalau nilainya beda.
 */
async function commitImport(rows, userId, { overwriteTglPasang = false, overwriteCounterAwal = false } = {}) {
  const candidateRows = (rows || []).filter((r) => r.include !== false);

  const result = {
    lines_created: 0,
    parts_created: 0,
    parts_updated: 0,
    tgl_pasang_overwritten: 0,
    counter_awal_overwritten: 0,
    mappings_created: 0,
    mappings_skipped: 0,
    rows_skipped: 0,
    row_errors: [],
  };

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const lineIdCache = new Map();

    // Tanggal Pasang Awal per Part (Line+Jig+Drawing): ambil baris pertama yang
    // ada isinya, supaya baris CL pertama yang kosong tidak menggagalkan
    // pembuatan Part padahal baris CL lain di Part yang sama sudah ngisi.
    const groupTglPasang = new Map();
    for (const r of candidateRows) {
      const gk = `${r.line_no}|${r.jig_name}|${r.drawing_no}`;
      if (r.tgl_pasang_awal && !groupTglPasang.has(gk)) groupTglPasang.set(gk, r.tgl_pasang_awal);
    }
    // Sama untuk pasangan Counter Awal - ambil dari baris pertama yang lengkap (angka 0 sah).
    const groupCounterAwal = new Map();
    for (const r of candidateRows) {
      const gk = `${r.line_no}|${r.jig_name}|${r.drawing_no}`;
      if (r.counter_awal !== null && r.counter_awal !== undefined && r.counter_awal_tanggal && !groupCounterAwal.has(gk)) {
        groupCounterAwal.set(gk, { counter_awal: Number(r.counter_awal), counter_awal_tanggal: r.counter_awal_tanggal });
      }
    }

    for (let idx = 0; idx < candidateRows.length; idx++) {
      const row = candidateRows[idx];
      const savepoint = `import_row_${idx}`;
      await client.query(`SAVEPOINT ${savepoint}`);

      try {
        if (!row.line_no || !row.jig_name || !row.drawing_no || !row.part_name || !row.cl_no || !row.target_shot) {
          throw new Error('Field wajib tidak lengkap (Line/Jig/Drawing/Part Name/CL No/Target Shot)');
        }

        // 1. Line - cari atau buat baru
        let lineId = lineIdCache.get(row.line_no);
        if (!lineId) {
          const existingLine = await lineQueries.findByName(row.line_no, client);
          if (existingLine) {
            lineId = existingLine.id;
          } else {
            const binLines = await lineQueries.findDeletedWithParts(row.line_no, client);
            if (binLines.length > 0) {
              throw new Error(
                `Line "${row.line_no}" ada di Recycle Bin dengan ${binLines[0].part_count} Part. Restore Line itu dulu atau pakai nama Line lain`
              );
            }
            const createdLine = await lineQueries.create({ line_name: row.line_no }, client);
            lineId = createdLine.id;
            result.lines_created += 1;
            await recordAudit(
              { tableName: 'lines', recordId: lineId, action: 'CREATE', oldValue: null, newValue: createdLine, userId },
              client
            );
          }
          lineIdCache.set(row.line_no, lineId);
        }

        // 2. Part - cari berdasarkan (line, jig, drawing bersih); buat baru
        //    atau update kalau part_name/target_shot beda dari yang sudah ada.
        const existingPart = await partQueries.findByLineJigAndDrawing(lineId, row.jig_name, row.drawing_no, client);
        let partId;
        if (existingPart) {
          partId = existingPart.id;
          const before = await partQueries.findRawById(partId, client);
          // tgl_pasang_awal: default HANYA diisi kalau part-nya belum punya nilai
          // tersimpan. Menimpa nilai yang sudah ada cuma kalau Admin secara
          // eksplisit menyalakan overwriteTglPasang di preview.
          const currentTgl = existingPart.tgl_pasang_awal || null;
          const isFill = !!row.tgl_pasang_awal && !currentTgl;
          const isOverwrite =
            overwriteTglPasang && !!row.tgl_pasang_awal && !!currentTgl && currentTgl !== row.tgl_pasang_awal;
          const shouldUpdateTglPasang = isFill || isOverwrite;
          if (shouldUpdateTglPasang) assertValidTglPasang(row.tgl_pasang_awal);

          // Counter Awal: isi kalau kosong di sistem; timpa hanya kalau diminta & beda.
          const rowCounter =
            row.counter_awal !== null && row.counter_awal !== undefined && row.counter_awal_tanggal
              ? { counter_awal: Number(row.counter_awal), counter_awal_tanggal: row.counter_awal_tanggal }
              : groupCounterAwal.get(`${row.line_no}|${row.jig_name}|${row.drawing_no}`) || null;
          const currentCounterTgl = existingPart.counter_awal_tanggal || null;
          const isCounterFill = !!rowCounter && !currentCounterTgl;
          const isCounterOverwrite =
            overwriteCounterAwal &&
            !!rowCounter &&
            !!currentCounterTgl &&
            (Number(existingPart.counter_awal) !== rowCounter.counter_awal ||
              currentCounterTgl !== rowCounter.counter_awal_tanggal);
          const shouldUpdateCounterAwal = isCounterFill || isCounterOverwrite;
          if (shouldUpdateCounterAwal) assertValidCounterAwal(rowCounter.counter_awal, rowCounter.counter_awal_tanggal);

          if (
            before.part_name !== row.part_name ||
            Number(before.target_shot) !== Number(row.target_shot) ||
            shouldUpdateTglPasang ||
            shouldUpdateCounterAwal
          ) {
            const updated = await partQueries.update(
              partId,
              {
                part_name: row.part_name,
                target_shot: Number(row.target_shot),
                ...(shouldUpdateTglPasang ? { tgl_pasang_awal: row.tgl_pasang_awal } : {}),
                ...(shouldUpdateCounterAwal
                  ? { counter_awal: rowCounter.counter_awal, counter_awal_tanggal: rowCounter.counter_awal_tanggal }
                  : {}),
              },
              client
            );
            result.parts_updated += 1;
            if (isOverwrite) result.tgl_pasang_overwritten += 1;
            if (isCounterOverwrite) result.counter_awal_overwritten += 1;
            await recordAudit(
              { tableName: 'parts', recordId: partId, action: 'UPDATE', oldValue: before, newValue: updated, userId },
              client
            );
          }
        } else {
          // Part BARU: Tanggal Pasang Awal wajib & valid (validasi otoritatif di
          // server - client bisa saja ngirim row hasil edit yang sudah dikosongkan).
          const tglPasang =
            row.tgl_pasang_awal || groupTglPasang.get(`${row.line_no}|${row.jig_name}|${row.drawing_no}`) || null;
          const newCounter =
            row.counter_awal !== null && row.counter_awal !== undefined && row.counter_awal_tanggal
              ? { counter_awal: Number(row.counter_awal), counter_awal_tanggal: row.counter_awal_tanggal }
              : groupCounterAwal.get(`${row.line_no}|${row.jig_name}|${row.drawing_no}`) || null;
          if (!tglPasang && !newCounter) {
            throw new Error('Part baru wajib punya Tanggal Pasang Awal, atau Counter Awal + Tanggal Counter Awal');
          }
          if (tglPasang) assertValidTglPasang(tglPasang);
          if (newCounter) assertValidCounterAwal(newCounter.counter_awal, newCounter.counter_awal_tanggal);
          const createdPart = await partQueries.create(
            {
              line_id: lineId,
              jig_name: row.jig_name,
              drawing_no: row.drawing_no,
              part_name: row.part_name,
              target_shot: Number(row.target_shot),
              tgl_pasang_awal: tglPasang,
              counter_awal: newCounter ? newCounter.counter_awal : null,
              counter_awal_tanggal: newCounter ? newCounter.counter_awal_tanggal : null,
            },
            client
          );
          partId = createdPart.id;
          result.parts_created += 1;
          await recordAudit(
            { tableName: 'parts', recordId: partId, action: 'CREATE', oldValue: null, newValue: createdPart, userId },
            client
          );
        }

        // 3. Part-CL Mapping - cari atau buat baru
        const existingMapping = await clMappingQueries.findByPartAndClNo(partId, row.cl_no, client);
        if (!existingMapping) {
          const createdMapping = await clMappingQueries.create(
            { part_id: partId, cl_no: row.cl_no, product_name: row.product_name, jig_name: row.jig_name },
            client
          );
          result.mappings_created += 1;
          await recordAudit(
            {
              tableName: 'part_cl_mapping',
              recordId: createdMapping.id,
              action: 'CREATE',
              oldValue: null,
              newValue: createdMapping,
              userId,
            },
            client
          );
        } else {
          result.mappings_skipped += 1;
        }

        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      } catch (rowErr) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
        result.rows_skipped += 1;
        result.row_errors.push({ row_number: row.row_number, message: rowErr.message });
      }
    }

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { parsePreview, commitImport, parseExcelDateCell };
