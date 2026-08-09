# ADR 006 — PM Monthly accrual: full recompute, bukan increment harian

## Status
Accepted

## Context
Poin akumulasi PM Monthly (`akumulasi_poin_monthly`) perlu bertambah
berdasarkan berapa kali Line running per hari sejak PM Monthly terakhir.
Dua pendekatan: (a) job harian yang MENAMBAH poin ke nilai yang sudah ada
(incremental), atau (b) job yang menghitung ULANG dari nol setiap kali
jalan, berdasarkan seluruh histori sejak PM Monthly terakhir (full
recompute).

## Decision
`pmMonthlyAccrualService.recomputeAllLines()` melakukan full recompute
setiap kali dijalankan — bukan increment dari nilai sebelumnya.

## Consequences
- **Plus:** idempotent. Kalau job ini gagal di tengah jalan, telat
  dijalankan, atau dijalankan dua kali karena alasan apapun, hasilnya
  tetap benar — tidak ada risiko poin ke-double-count seperti pada pola
  increment.
- **Plus:** konsisten dengan filosofi yang sudah dipakai di PM Part
  (`getAllComputedMetrics()` juga full-compute setiap dipanggil, bukan
  cache yang di-increment) — satu pola mental yang sama di seluruh
  codebase untuk "nilai turunan dari histori".
- **Minus:** lebih banyak komputasi per run (iterasi semua hari sejak PM
  Monthly terakhir, per Line) dibanding sekadar `+= poin_hari_ini`. Untuk
  skala Line & frekuensi job saat ini (interval puluhan menit, bukan
  per-detik), biaya ini diabaikan.
