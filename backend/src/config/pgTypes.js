// src/config/pgTypes.js
//
// FIX "input tanggal 7 Juli, tampil/terhitung 6 Juli".
// Root cause: driver pg secara default mengubah kolom DATE (OID 1082) jadi
// objek JS Date di jam 00:00 zona waktu PROSES Node. Kalau server jalan di
// WIB (Asia/Jakarta, UTC+7), DATE '2026-07-07' jadi 2026-07-07T00:00+07 =
// 2026-07-06T17:00Z. Lalu dateUtils.parseDbDate() (dayjs.utc) membacanya
// sebagai 6 Juli -> Tgl Terakhir di Monitoring, baseline poin akumulasi, dan
// JSON ke frontend semuanya mundur 1 hari. Data di database sendiri BENAR
// (INSERT pakai string 'YYYY-MM-DD'), yang salah cuma cara membacanya.
//
// Solusi: DATE tidak diparsing sama sekali, dibiarkan string 'YYYY-MM-DD'.
// Tanggal kalender memang tidak punya zona waktu, jadi hasilnya sama di
// server UTC maupun WIB. Berlaku global untuk semua Pool (db.js & conmasDb.js).
//
// Wajib di-require SEBELUM query pertama (dipanggil dari db.js & conmasDb.js).
// Timestamp (TIMESTAMPTZ) tidak terpengaruh.

const { types } = require('pg');

const PG_DATE_OID = 1082;

types.setTypeParser(PG_DATE_OID, (value) => value);
