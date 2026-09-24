// scripts/seed-dashboard-dummy.js
// ============================================================
// DUMMY DATA SEEDER buat Dashboard Management - DEV/DEMO ONLY.
//
// Kenapa script (bukan INSERT SQL biasa): angka dashboard lu itu HASIL
// FORMULA di service layer (pmPartService.computeMetrics, pmLineService,
// akumulasi poin) yang baca dari production_cache + pm_part_history +
// app_settings - BUKAN kolom yang tinggal di-INSERT. Jadi biar dashboard
// "nyala", script ini ngisi SELURUH RANTAI-nya dengan angka yang sengaja
// dihitung mundur supaya jatuh di bucket status yang gua mau (OK/WARNING/
// DANGER buat part, HEALTHY/WARNING/CRITICAL buat line).
//
// Deterministik (seeded RNG) - jalan berkali-kali hasilnya sama.
// Idempotent-ish: --clean dulu baru seed lagi kalau mau ulang.
//
// PAKAI (dari folder backend/):
//   node scripts/seed-dashboard-dummy.js          -> isi dummy
//   node scripts/seed-dashboard-dummy.js --clean  -> hapus SEMUA dummy (by prefix line)
//
// KONEKSI DB: pakai DATABASE_URL kalau ada, atau PGHOST/PGUSER/PGPASSWORD/
// PGDATABASE/PGPORT. Sama kayak app lu. (kalau ada dotenv, otomatis ke-load)
//
// AMAN DIKOSONGIN: semua line dummy pakai prefix `DUMMY_LINE_PREFIX`
// (default "INJ-"). --clean cuma hapus row yang nyangkut ke line prefix itu,
// FK-safe order. NGGAK nyentuh users / app_settings / roles.
// ============================================================

'use strict';

try { require('dotenv').config(); } catch { /* dotenv opsional */ }

// GUARD: seeder ini nyuntik data palsu (dan --clean menghapus data by prefix
// line). Jangan pernah kejalan di production tanpa sengaja.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_DUMMY !== 'true') {
  console.error('[DITOLAK] NODE_ENV=production. Set ALLOW_SEED_DUMMY=true kalau memang sengaja (JANGAN di DB asli).');
  process.exit(1);
}

const { Pool } = require('pg');

// ---------------- KONFIG (tinggal tweak di sini) ----------------
const CFG = {
  SEED: 20260908,            // ganti kalau mau variasi angka lain
  LINE_PREFIX: 'INJ-',       // penanda line dummy (buat --clean)
  N_LINES: 12,
  PARTS_PER_LINE: [4, 7],    // min..max part per line
  PROD_DAYS: 60,             // berapa hari production_cache per part
  DAILY_OUTPUT: [500, 2000], // shot/hari per part (jadi ~usage_per_day)

  // Distribusi status LINE (donut). Sisanya HEALTHY.
  LINE_WARNING: 3,
  LINE_CRITICAL: 2,

  // Peluang bucket status PART (sisanya OK).
  PART_WARNING_P: 0.20,
  PART_DANGER_P: 0.10,

  // app_settings default (dari initial-schema) - dipakai buat NGITUNG target
  // supaya konsisten sama formula. Kalau lu ubah settings di DB, samain juga.
  PART_DANGER_MULT: 2,       // remaining <= 2*usage -> DANGER
  PART_WARNING_MULT: 6,      // remaining <= 6*usage -> WARNING
  MONTHLY_CAP: 30,           // pm_monthly_point_cap
  MONTHLY_DANGER_DAYS: 2,    // sisa <= 2 -> DANGER
  MONTHLY_WARNING_DAYS: 5,
  WEEKLY_CAP: 7,             // pm_weekly_total_days (dipakai sbg cap poin)
  WEEKLY_DANGER_DAYS: 2,
  WEEKLY_WARNING_DAYS: 5,
};

const PART_NAMES = [
  'Ejector Pin', 'Core Pin', 'Sprue Bush', 'Guide Pin', 'Slide Core',
  'Cavity Insert', 'Runner Lock', 'Return Pin', 'Angular Pin', 'Wear Plate',
];
const JIG_NAMES = ['Contact Cutting A', 'Contact Cutting B', 'Contact Cutting C',
  'Forming Station 1', 'Forming Station 2', 'Insert Molding A', 'Insert Molding B'];

// ---------------- util ----------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(CFG.SEED);
const ri = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const pad2 = (n) => String(n).padStart(2, '0');
function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Tentuin bucket status LINE per index (deterministik).
function lineBuckets() {
  const arr = new Array(CFG.N_LINES).fill('HEALTHY');
  let idx = 0;
  for (let i = 0; i < CFG.LINE_CRITICAL && idx < arr.length; i++) arr[idx++] = 'CRITICAL';
  for (let i = 0; i < CFG.LINE_WARNING && idx < arr.length; i++) arr[idx++] = 'WARNING';
  // acak posisinya biar gak numpuk di depan
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Poin akumulasi (monthly & weekly) buat CAPAI bucket line yg diinginkan.
// Gua set BOTH monthly & weekly ke bucket yang sama -> aman apapun logika
// gabungannya (monthly-only / weekly-only / worst-of), hasil bucketnya sama.
function accrualFor(bucket) {
  const m = (cap, dngr, warn) => {
    if (bucket === 'CRITICAL') return cap - ri(0, dngr);          // sisa <= danger
    if (bucket === 'WARNING') return cap - ri(dngr + 1, warn);    // sisa di (danger,warn]
    return cap - ri(warn + 2, Math.min(cap, warn + 12));          // sisa besar -> healthy
  };
  return {
    monthly: Math.max(0, m(CFG.MONTHLY_CAP, CFG.MONTHLY_DANGER_DAYS, CFG.MONTHLY_WARNING_DAYS)),
    weekly: Math.max(0, m(CFG.WEEKLY_CAP, CFG.WEEKLY_DANGER_DAYS, CFG.WEEKLY_WARNING_DAYS)),
  };
}

// Hitung target_shot supaya part jatuh di bucket status tertentu, given
// counter (=daily*days) & usage (~daily). Margin lebar biar gak flip walau
// pembagian usage_per_day di service meleset ±belasan %.
function targetForBucket(bucket, counter, daily) {
  if (bucket === 'DANGER') return counter + daily * ri(0, CFG.PART_DANGER_MULT); // remaining <= 2*usage
  if (bucket === 'WARNING') return counter + daily * ri(CFG.PART_DANGER_MULT + 1, CFG.PART_WARNING_MULT); // (2,6]
  return counter + daily * ri(CFG.PART_WARNING_MULT + 4, CFG.PART_WARNING_MULT + 40); // OK, jauh
}

function partBucket() {
  const r = rng();
  if (r < CFG.PART_DANGER_P) return 'DANGER';
  if (r < CFG.PART_DANGER_P + CFG.PART_WARNING_P) return 'WARNING';
  return 'OK';
}

// ---------------- main ----------------
async function main() {
  const clean = process.argv.includes('--clean');
  const pool = new Pool(
    process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : undefined
  );
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Selalu bersihin dulu (biar re-run gak dobel), by prefix line.
    const like = CFG.LINE_PREFIX + '%';
    await client.query(
      `DELETE FROM production_cache WHERE line_id IN (SELECT id FROM lines WHERE line_name LIKE $1)`, [like]);
    // snapshot table (migration 021) - hapus kalau ada
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='pm_part_status_snapshot') THEN
          DELETE FROM pm_part_status_snapshot WHERE line_id IN (SELECT id FROM lines WHERE line_name LIKE '${like}');
        END IF;
      END $$;`);
    await client.query(
      `DELETE FROM part_cl_mapping WHERE part_id IN (SELECT p.id FROM parts p JOIN lines l ON p.line_id=l.id WHERE l.line_name LIKE $1)`, [like]);
    await client.query(
      `DELETE FROM pm_part_history WHERE part_id IN (SELECT p.id FROM parts p JOIN lines l ON p.line_id=l.id WHERE l.line_name LIKE $1)`, [like]);
    await client.query(
      `DELETE FROM pm_monthly_history WHERE line_id IN (SELECT id FROM lines WHERE line_name LIKE $1)`, [like]);
    await client.query(
      `DELETE FROM pm_monthly_helper WHERE line_id IN (SELECT id FROM lines WHERE line_name LIKE $1)`, [like]);
    await client.query(
      `DELETE FROM parts WHERE line_id IN (SELECT id FROM lines WHERE line_name LIKE $1)`, [like]);
    await client.query(`DELETE FROM lines WHERE line_name LIKE $1`, [like]);

    if (clean) {
      await client.query('COMMIT');
      console.log(`✔ CLEAN selesai - semua dummy (line "${CFG.LINE_PREFIX}*") dihapus.`);
      return;
    }

    // Butuh 1 user buat FK user_id di history.
    const u = await client.query(
      `SELECT id FROM users ORDER BY (role_id IS NOT NULL) DESC, id ASC LIMIT 1`);
    if (u.rowCount === 0) {
      throw new Error('Belum ada user di tabel users. Jalankan migration seed-admin-user dulu.');
    }
    const userId = u.rows[0].id;

    const buckets = lineBuckets();
    let cntLinesH = 0, cntLinesW = 0, cntLinesC = 0;
    let cntPartsOK = 0, cntPartsW = 0, cntPartsD = 0;
    let clSeq = 0, drwSeq = 0;

    for (let li = 0; li < CFG.N_LINES; li++) {
      const lineName = CFG.LINE_PREFIX + pad2(li + 1);
      const lineBucket = buckets[li];
      if (lineBucket === 'HEALTHY') cntLinesH++;
      else if (lineBucket === 'WARNING') cntLinesW++;
      else cntLinesC++;

      const lineRes = await client.query(
        `INSERT INTO lines (line_name, is_active) VALUES ($1, TRUE) RETURNING id`, [lineName]);
      const lineId = lineRes.rows[0].id;

      // pm_monthly_helper (drive status line -> donut)
      const acc = accrualFor(lineBucket);
      await client.query(
        `INSERT INTO pm_monthly_helper
           (line_id, tgl_pm_monthly_terakhir, tgl_pm_weekly_terakhir,
            akumulasi_poin_monthly, akumulasi_poin_weekly)
         VALUES ($1,$2,$3,$4,$5)`,
        [lineId, dateNDaysAgo(ri(20, 40)), dateNDaysAgo(ri(3, 10)), acc.monthly, acc.weekly]);

      // pm_monthly_history (buat ketepatan Monthly/Weekly). Line jelek =
      // rasio on_time rendah -> nongol di ketepatan_attention.
      const onTimeRatio = lineBucket === 'CRITICAL' ? 0.4 : lineBucket === 'WARNING' ? 0.7 : 0.92;
      for (let e = 0; e < ri(6, 12); e++) {
        const jenis = rng() < 0.5 ? 'MONTHLY' : 'WEEKLY';
        const onTime = rng() < onTimeRatio;
        await client.query(
          `INSERT INTO pm_monthly_history (line_id, tgl_input, jenis_pm, on_time, user_id, pic_name)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [lineId, dateNDaysAgo(ri(1, 330)), jenis, onTime, userId, pick(['Ating', 'Jofri', 'Tety', 'Amalia'])]);
      }

      // Parts
      const nParts = ri(CFG.PARTS_PER_LINE[0], CFG.PARTS_PER_LINE[1]);
      for (let p = 0; p < nParts; p++) {
        const pb = partBucket();
        if (pb === 'OK') cntPartsOK++;
        else if (pb === 'WARNING') cntPartsW++;
        else cntPartsD++;

        const daily = ri(CFG.DAILY_OUTPUT[0], CFG.DAILY_OUTPUT[1]);
        const days = CFG.PROD_DAYS;
        const counter = daily * days;
        const target = Math.max(1, targetForBucket(pb, counter, daily));
        const drawingNo = `DRW-${pad2(li + 1)}-${String(++drwSeq).padStart(4, '0')}`;
        const clNo = `CL-${String(++clSeq).padStart(5, '0')}`; // unik per part (hindari cross-count)

        const partRes = await client.query(
          `INSERT INTO parts (line_id, drawing_no, part_name, target_shot, jig_name, is_active)
           VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING id`,
          [lineId, drawingNo, pick(PART_NAMES), target, pick(JIG_NAMES)]);
        const partId = partRes.rows[0].id;

        // mapping part -> cl_no (join key ke production_cache)
        await client.query(
          `INSERT INTO part_cl_mapping (part_id, cl_no, product_name) VALUES ($1,$2,$3)`,
          [partId, clNo, 'Dummy Product']);

        // baseline penggantian: tgl_ganti = (days+5) hari lalu, counter 0.
        // Semua production_cache setelahnya jadi "counter berjalan".
        await client.query(
          `INSERT INTO pm_part_history
             (part_id, tgl_ganti, shift, counter_saat_diganti, jenis_penggantian, on_time, user_id, pic_name)
           VALUES ($1,$2,$3,0,'TERJADWAL',TRUE,$4,$5)`,
          [partId, dateNDaysAgo(days + 5), ri(1, 3), userId, pick(['Ating', 'Jofri', 'Tety'])]);

        // histori ketepatan tambahan (buat KPI Ketepatan PM Part)
        for (let h = 0; h < ri(2, 5); h++) {
          const onTime = rng() < onTimeRatio;
          await client.query(
            `INSERT INTO pm_part_history
               (part_id, tgl_ganti, shift, counter_saat_diganti, jenis_penggantian, on_time, user_id, pic_name)
             VALUES ($1,$2,$3,$4,'TERJADWAL',$5,$6,$7)`,
            [partId, dateNDaysAgo(ri(days + 10, 330)), ri(1, 3),
              ri(0, Math.max(1, target - 1)), onTime, userId, pick(['Ating', 'Jofri'])]);
        }

        // production_cache: output konstan `daily` selama `days` terakhir.
        // counter = daily*days -> remaining = target - counter -> bucket.
        const rows = [];
        const params = [];
        for (let d = 1; d <= days; d++) {
          const base = params.length;
          params.push(lineId, clNo, dateNDaysAgo(d), daily);
          rows.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4})`);
        }
        await client.query(
          `INSERT INTO production_cache (line_id, cl_no, tanggal, output_actual)
           VALUES ${rows.join(',')}
           ON CONFLICT (line_id, cl_no, tanggal) DO NOTHING`,
          params);
      }
    }

    await client.query('COMMIT');

    console.log('✔ SEED selesai. Ringkasan (kira-kira, sebelum formula service):');
    console.log(`  Lines   : total ${CFG.N_LINES} | healthy ${cntLinesH} | warning ${cntLinesW} | critical ${cntLinesC}`);
    console.log(`  Parts   : OK ${cntPartsOK} | warning ${cntPartsW} | danger ${cntPartsD} (total ${cntPartsOK + cntPartsW + cntPartsD})`);
    console.log('  Buka Dashboard Management buat lihat hasilnya.');
    console.log('  Kosongin lagi: node scripts/seed-dashboard-dummy.js --clean');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ GAGAL, rollback. Error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
