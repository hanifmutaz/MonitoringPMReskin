# Security Review — PM Monitoring

> **Catatan tentang dokumen ini:** file `SECURITY_REVIEW.md` yang asli
> direferensikan di banyak tempat di kode (migration, komentar service,
> test) tapi tidak pernah ada di repo ini. Isi di bawah **direkonstruksi**
> dari jejak yang masih bisa dilacak di kode — komentar yang menyebut
> `Finding #N`, migration yang mengimplementasikan perbaikannya, dan test
> yang memverifikasinya. Finding yang jejaknya tidak ketemu di kode
> ditandai **tidak diketahui**, bukan diisi tebakan. Kalau nemu dokumen
> aslinya, ganti file ini dengan itu.

## Status ringkas

| # | Finding | Status | Bukti implementasi |
|---|---|---|---|
| 1 | Tidak diketahui | — | Tidak ada jejak referensi di kode |
| 2 | Login (sukses/gagal) tidak dicatat | ✅ Fixed | `login_audit_log`, migration `1700000003000`, `authService.login()` |
| 3 | Audit log & login audit log belum append-only secara teknis | ✅ Fixed | Trigger `prevent_append_only_log_modification`, migration `1700000004000` |
| 4 | Role/status user di-trust dari JWT lama, tidak di-cek ulang tiap request | ✅ Fixed | `requireAuth` query ulang `is_active` & role ke DB tiap request, `authMiddleware.js` |
| 5 | Audit log User Management belum granular (tidak jelas apa yang berubah) | ✅ Fixed | Kolom `action_detail`, migration `1700000004000` |
| 6 | Kebijakan password memaksa kompleksitas (huruf besar+simbol+angka), mendorong pola gampang ditebak | ✅ Fixed | `passwordPolicy.js` — pola NIST 800-63B (panjang minimal + cek common password list, bukan aturan kompleksitas) |
| 7 | Token JWT ikut dikembalikan di response body (berpotensi ke-log/ke-cache di tempat yang tidak seharusnya) | ✅ Fixed | Token hanya dikirim lewat `Set-Cookie` httpOnly, body cuma berisi `user`; diverifikasi di `auth.integration.test.js` |
| 8 | Tidak diketahui | — | Tidak ada jejak referensi di kode |
| 9 | Tidak diketahui | — | Tidak ada jejak referensi di kode |
| 10 | Tidak diketahui | — | Tidak ada jejak referensi di kode |

7 dari 10 finding di atas bisa diverifikasi statusnya lewat kode (semuanya
Fixed). 3 sisanya (kemungkinan besar termasuk di antara #1, #8, #9, #10)
tidak meninggalkan jejak apa pun di kode/komentar — entah karena
solusinya tidak butuh perubahan kode (mis. rekomendasi proses/operasional),
entah karena belum dikerjakan. Perlu dicek ke dokumen asli atau ke yang
melakukan review kalau masih ada aksesnya.

## Detail per finding (yang bisa direkonstruksi)

### Finding #2 — Login attempt tidak tercatat
Sebelumnya tidak ada cara membedakan "user tidak ada" vs "user ada tapi
salah password" vs "user dinonaktifkan" di level log — menyulitkan deteksi
brute-force/enumeration. Sekarang setiap upaya login (sukses maupun semua
skenario gagal) dicatat ke tabel `login_audit_log` terpisah dari
`audit_log`, termasuk `username_attempted` mentah (bukan cuma `user_id`)
supaya percobaan ke username yang tidak ada pun tetap tercatat. Pesan
error ke **client** tetap generik ("Username atau password salah") di
semua kasus — pembedaan cuma ada di log internal.

### Finding #3 — Audit log bisa diubah/dihapus
`audit_log` dan `login_audit_log` awalnya cuma "append-only by convention"
(tidak ada yang menegakkan secara teknis). Sekarang keduanya dilindungi
trigger `prevent_append_only_log_modification` yang menolak `UPDATE`/
`DELETE` untuk **siapa pun**, termasuk owner tabel — dipilih trigger
daripada `REVOKE` privilege karena `REVOKE` tidak efektif terhadap role
yang menjadi owner tabel. **Known limitation yang masih berlaku**: kalau
kredensial DB dikompromikan total, trigger-nya sendiri secara teknis bisa
di-`DROP` oleh yang punya akses DDL — mitigasi ini menutup celah
modifikasi baris, bukan proteksi terhadap kompromi DB penuh.

### Finding #4 — Role/status stale dari JWT
Sebelumnya kemungkinan role atau status aktif user dipercaya langsung dari
payload JWT, yang berarti perubahan role atau penonaktifan user oleh Admin
baru berlaku setelah token lama expired (sampai 8 jam). Sekarang
`requireAuth` query ulang `is_active` dan permission user ke DB di **setiap
request** (bukan di-bake ke JWT), jadi penonaktifan user atau perubahan
permission oleh Admin langsung berlaku di request berikutnya, tanpa perlu
menunggu token expired atau user re-login. Diverifikasi lewat
`auth.integration.test.js`.

### Finding #5 — Audit log User Management tidak granular
Kolom `action` di `audit_log` cuma `CREATE`/`UPDATE`/`DELETE` — tidak
jelas *apa* yang berubah pas `UPDATE`. Ditambah kolom `action_detail`
(nullable) untuk ringkasan human-readable, mis. "Role diubah: Operator ->
Supervisor" atau "Password direset", tanpa mengubah `action` yang dipakai
bersama tabel lain (Master Data, Settings, PM History).

### Finding #6 — Kebijakan password kompleksitas dipaksa
Aturan lama kemungkinan mewajibkan kombinasi huruf besar+kecil+angka+
simbol — pola yang secara empiris justru mendorong password gampang
ditebak (`Password123!`). Diganti mengikuti semangat NIST 800-63B:
panjang minimal 12 karakter, dicek terhadap daftar password umum, dan
tidak boleh sama dengan username — tanpa aturan kompleksitas paksa.

### Finding #7 — Token di response body
Token JWT sebelumnya kemungkinan ikut dikembalikan di body JSON response
login (selain atau sebagai ganti cookie) — risiko token ke-log di access
log server, browser history (kalau lewat GET), atau tools debugging pihak
ketiga yang mencatat response body. Sekarang token **hanya** dikirim lewat
header `Set-Cookie` (`httpOnly`), body response cuma berisi data `user`
non-sensitif. Diverifikasi eksplisit di test: *"Login sukses: 200, cookie
httpOnly ter-set, token TIDAK ada di body"*.

## Known limitations (belum/tidak jadi finding formal, tapi worth dicatat)

- **Tidak ada revocation/blacklist token.** Logout cuma menghapus cookie
  di browser; kalau token sudah bocor sebelum logout, token itu tetap
  valid sampai expired (8 jam) — logout tidak bisa memaksa invalidasi di
  sisi server. Trade-off yang masuk akal untuk internal tool skala kecil,
  tapi perlu diketahui.
- **Tidak ada self-service "lupa password".** Satu-satunya jalan reset
  password adalah lewat Admin (User Management) atau akses langsung ke
  DB. Untuk jumlah user kecil ini wajar, tapi jadi beban operasional
  kalau user bertambah banyak.
- **`ADMIN_DEFAULT_PASSWORD`** kalau tidak di-set lewat environment
  variable saat migration pertama kali jalan, fallback ke default
  `ChangeMe123!` yang predictable — wajib diganti segera setelah deploy
  pertama (sudah diingatkan di komentar migration `1700000001000`, tapi
  tidak ada enforcement teknis yang memaksa penggantian ini).

## Dokumen terkait

- `ThreatModel.md` — direferensikan di kode (`auth.integration.test.js`)
  tapi juga tidak ada di repo. Belum direkonstruksi.
- `TECHNICAL_DEBT.md` — direferensikan di `doc/Architecture.md`, juga
  belum ada.
- `Architecture.md` — gambaran arsitektur & cross-cutting concerns secara
  umum.