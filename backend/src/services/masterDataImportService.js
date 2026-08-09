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

const HEADER_ALIASES = {
  line_no: ['line no', 'line no.', 'line'],
  cl_no: ['cl no', 'cl no.', 'cl'],
  product_name: ['product name'],
  jig_name: ['jig name', 'jig'],
  drawing_no: ['drawing no', 'drawing no.'],
  part_name: ['part name'],
  target_shot: ['target shot'],
  pemakaian_hari: ['pemakaian/hari', 'pemakaian hari', 'pemakaian per hari'],
};

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
    workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
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

    const { original, cleaned, wasAutoCleaned } = autoCleanDrawingNo(r[colMap.drawing_no]);

    const errors = [];
    if (!lineNo) errors.push('Line No kosong');
    if (!clNo) errors.push('CL No kosong');
    if (!jigName) errors.push('Jig Name kosong');
    if (!cleaned) errors.push('Drawing No kosong');
    if (!partName) errors.push('Part Name kosong');
    if (!Number.isFinite(targetShot) || targetShot <= 0) errors.push('Target Shot harus angka > 0');

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
    if (distinctNames.size > 1 || distinctShots.size > 1) {
      const rowNums = groupRows.map((r) => r.row_number).join(', ');
      for (const r of groupRows) {
        r.errors.push(
          `Part Name/Target Shot tidak konsisten untuk Drawing No yang sama (baris: ${rowNums}) - samakan dulu sebelum commit`
        );
      }
    }
  }

  // Cross-check ke DB - biar Admin tahu mana yang bakal jadi Line/Part BARU
  // vs mana yang cuma nambah CL Mapping ke Part yang sudah ada.
  const existingLines = await lineQueries.findAll({});
  const lineMap = new Map(existingLines.map((l) => [l.line_name, l.id]));

  for (const row of parsedRows) {
    if (row.errors.length > 0) {
      row.status = 'error';
      row.line_exists = false;
      row.part_exists = false;
      continue;
    }
    const lineId = lineMap.get(row.line_no);
    row.line_exists = !!lineId;
    row.part_exists = false;
    if (lineId) {
      const existingPart = await partQueries.findByLineJigAndDrawing(lineId, row.jig_name, row.drawing_no);
      row.part_exists = !!existingPart;
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
 */
async function commitImport(rows, userId) {
  const candidateRows = (rows || []).filter((r) => r.include !== false);

  const result = {
    lines_created: 0,
    parts_created: 0,
    parts_updated: 0,
    mappings_created: 0,
    mappings_skipped: 0,
    rows_skipped: 0,
    row_errors: [],
  };

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const lineIdCache = new Map();

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
          if (before.part_name !== row.part_name || Number(before.target_shot) !== Number(row.target_shot)) {
            const updated = await partQueries.update(
              partId,
              { part_name: row.part_name, target_shot: Number(row.target_shot) },
              client
            );
            result.parts_updated += 1;
            await recordAudit(
              { tableName: 'parts', recordId: partId, action: 'UPDATE', oldValue: before, newValue: updated, userId },
              client
            );
          }
        } else {
          const createdPart = await partQueries.create(
            {
              line_id: lineId,
              jig_name: row.jig_name,
              drawing_no: row.drawing_no,
              part_name: row.part_name,
              target_shot: Number(row.target_shot),
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

module.exports = { parsePreview, commitImport };
