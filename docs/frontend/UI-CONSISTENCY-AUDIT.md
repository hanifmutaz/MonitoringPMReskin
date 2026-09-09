# UI Consistency Audit — Monitoring PM Web

> **Status:** Living document. Dibuat sebagai Fase 0 dari "rapiin seluruh UI".
> **Prinsip:** Design-system-first. Perbaiki PRIMITIVE (`ui/`) sekali → propagasi ke semua halaman otomatis. JANGAN poles per-halaman satu-satu.
> **Aturan main:** setiap keputusan (kolom "Keputusan") harus di-LOCK sebelum ngoding. Sekali lock, jadi sumber kebenaran — halaman baru wajib ikut.

**Sumber audit:** 18 screenshot (Dashboard, PM Part/Line/Monthly/Weekly, Master Data, Inventory, Settings, Users, Recycle Bin, Audit Log, Profile, History) + codebase FE yang sudah dikirim (KpiCard, LineStatusDonut, CriticalAlertsPanel, GanttUpcomingPanel, DashboardPage, card.jsx, empty-state.jsx, StatusBadge, dll).

---

## 0. Legenda prioritas

| Tanda | Arti |
|---|---|
| 🔴 P1 | Paling keliatan "nggak niat" / propagasi luas. Kerjain duluan. |
| 🟡 P2 | Kerasa, tapi nggak bikin app keliatan rusak. |
| 🟢 P3 | Nice-to-have. Poles akhir. |

---

## 1. Temuan inkonsistensi (dari yang paling parah)

### 🔴 A1 — Format tanggal mentah
- **Masalah:** History PM Part/Line nampilin `2026-07-04T17:00:00.000Z` (ISO mentah). Paling "nggak enterprise" dari semua screenshot.
- **Sebar:** semua tabel yang ada kolom tanggal (History, Audit Log, Inventory History, detail part `last_tgl_ganti`).
- **Akar:** nggak ada util format tanggal terpusat. Tiap tempat render `Date` apa adanya.
- **Keputusan (LOCKED, D3):** bikin `src/utils/formatDate.js` → `04 Jul 2026` (dan `04 Jul 2026, 14:30` buat yang butuh jam). Pakai `dayjs` + locale `id` (udah keinstall, udah dipakai di GanttUpcomingPanel). **LOCK format:** `DD MMM YYYY`.
- **Status:** ✅ selesai — 08 Sep 2026. Util `formatDate.js` sendiri udah komplet dari awal (`formatDate`/`formatDateTime`/`formatRelative`/`toDateKey`, null-safe). Yang saya kerjain sesi ini: audit menyeluruh cari sisa tanggal yang lolos dari util terpusat — ketemu 3 tempat (`userManagementColumns.jsx` ×2 — "Daftar Sejak" & "Last Login", `inventoryColumns.jsx` ×1 — "Tanggal" movement history) masih pakai `new Date(...).toLocaleString('id-ID')` mentah (format beda tergantung browser locale). Diganti `formatDateTime()`. Sisa `toLocaleString('id-ID')` di app SEMUA buat format angka (counter/qty/stock), bukan tanggal — bukan pelanggaran. `todayStr()` di `PmPartHistoryForm`/`PmLineHistoryForm` (`toISOString().slice(0,10)`) juga bukan pelanggaran — itu value buat `<input type="date">`, bukan display. Final sweep: nol ISO mentah / `toLocaleString` tanggal ad-hoc tersisa. Build diverifikasi lolos.

### 🔴 A2 — Radius nyampur (rounded-lg vs rounded-xl)
- **Masalah:** `KpiCard` = `rounded-xl` + shadow. `card.jsx` (semua panel) = `rounded-lg` + flat. Di satu halaman ada 2 "bahasa". Ini akar rasa "50% redesign".
- **Sebar:** SETIAP halaman yang punya KPI + panel (Dashboard, PM Part, PM Line).
- **Keputusan (LOCKED, D1):** `rounded-xl` buat semua surface (Card, KpiCard, NeedsDataCard, DataTable wrapper, EmptyState, Dialog/AlertDialog, panel hand-rolled). `ui/card.jsx` jadi sumber, semua Card-clone hand-rolled (pola `rounded-lg border border-border bg-card p-4.5`) ikut disamain manual karena banyak halaman bikin panel sendiri tanpa pakai komponen `Card`.
- **Status:** ✅ selesai — migrasi menyeluruh 08 Sep 2026. Cakupan: `card.jsx`, `DataTable.jsx` (wrapper + table container), `empty-state.jsx`, `dialog.jsx`, `alert-dialog.jsx`, `NotificationBell`, `GanttUpcomingPanel`, `KetepatanPerLinePanel`, `PmPartHistoryForm`/`PmLineHistoryForm` (panel standalone), dropzone `ImportMasterDataTab`, table-wrapper `PmPartHistoryPage`, + 19 panel hand-rolled di `CriticalAlertsPanel`, `PackageLockedNotice`, `ProfilePage`, `DashboardPmLineWeeklyPage`, `MasterDataPage`, `InventoryPage`, `SettingsPage`, `UserManagementPage`, `DashboardPmPartPage`. Build diverifikasi lolos (`npm run build`), bundle utama tetap ~130KB (nol bloat).
  - **Exception (LOCKED juga, biar eksplisit):** elemen kecil non-"surface" TETAP `rounded-lg` — inline alert/message strip (danger/warn/accent/ok-dim, pola `ui/alert.jsx`), nav item `Sidebar`, blok `<pre>` log/JSON di `AuditLogPage`, banner tipis (`BulkDeleteBar`, `SelectAllAcrossPagesBar`, `RecycleBinPage`). Ini bukan pelanggaran D1 — mereka bukan "surface" panel, melainkan atom yang secara sengaja beda kelas visual (lebih kecil, lebih ringan).

### 🔴 A3 — Elevation policy nggak jelas (shadow vs flat)
- **Masalah:** `DESIGN-TOKENS.md` bilang "no shadow, layering only". Tapi KpiCard sekarang pakai shadow + hover lift (pengecualian yang belum didokumentasi resmi). Panel lain flat.
- **Keputusan (usulan):** tetapkan aturan eksplisit:
  - Surface interaktif / "hero" (KPI) → boleh `shadow-sm` + hover lift.
  - Surface pasif (panel isi, tabel) → flat, pisah pakai border + bg layering.
  Tulis di `DESIGN-TOKENS.md` biar nggak ambigu.
- **Status:** ✅ selesai — 08 Sep 2026. Aturan D2 ditulis eksplisit di `DESIGN-TOKENS.md` §"Elevation rules" (sebelumnya cuma tulis "Unknown"). Nggak ada perubahan kode (aturan udah diimplementasi sejak `card.jsx`/`KpiCard.jsx` versi Fase 1 — ini murni nutup gap dokumentasi).

### 🟡 A4 — Row height tabel nggak seragam
- **Masalah:** Monitoring Monthly & Weekly row-nya TINGGI (ketepatan ditaro di baris ke-2 → tiap row makan 2 baris). PM Part lebih padat. Master Data beda lagi.
- **Sebar:** semua tabel (Monitoring, Master Data, Users, Inventory, History, Audit Log, ketepatan_attention).
- **Keputusan (LOCKED, D4):** standarisasi lewat `DataTable` primitive: cell `px-2.5 py-2.5`, header `px-2.5 py-2 text-[11px] uppercase mono text-faint border-b`, hover `bg-panel-2`, border-soft antar-row. Ketepatan jadi inline badge (bukan baris ke-2).
- **Status:** ✅ selesai — 08 Sep 2026. Nemuin dua hal udah dikerjain lebih dulu (kode duluan dari dokumen, kayak A2): (1) `pmLineColumns.jsx` udah punya komentar eksplisit "A4/D4" bilang `StatusWithKetepatan` UDAH diubah dari 2-baris jadi 1-baris inline (`StatusBadge` + `PercentBadge`) — ini fix inti A4 yang paling parah. (2) `DataTable.jsx` sendiri udah pola cell yang bagus tapi paddingnya `px-3 py-3`, belum `px-2.5 py-2.5` sesuai target. Yang saya kerjain sesi ini: samain padding `px-3`→`px-2.5` & `py-3`→`py-2.5` di **`DataTable.jsx`** (primitive, propagasi ke 11+ consumer) + 2 tabel hand-rolled yang masih beda (`PmPartHistoryPage.jsx`, `ImportMasterDataTab.jsx`). Tabel lain (`DashboardPage`, `DashboardPmPartPage`, `DashboardPmLineWeeklyPage`) ternyata udah `px-2.5 py-2.5` dari awal — nggak disentuh. Final sweep: 0 sisa `px-3`/`py-3` di elemen `<td>`/`<th>` mana pun. Build diverifikasi lolos.

### 🟡 A5 — Empty state belum konsisten di luar dashboard
- **Masalah:** dashboard udah pakai `<EmptyState>` (abis fix kemarin). Tapi halaman lain (Monitoring "Semua Line OK", tabel kosong lain) mungkin masih teks polos.
- **Keputusan (usulan):** audit semua kondisi kosong → wajib `<EmptyState>` (icon + title + description). Primitive udah ada, tinggal dipakai.
- **Status:** ✅ selesai — audit 08 Sep 2026. Nemuin 1 kasus persis: "Semua Line dalam status OK" (`DashboardPmLineWeeklyPage.jsx`, tabel "Line Butuh Perhatian") masih teks polos → diganti `<EmptyState icon={ShieldCheck} tone="ok">`. Sekalian nemuin & benerin bug laten: `CriticalAlertsPanel.jsx` udah manggil `tone="ok"` dari dulu tapi `empty-state.jsx` belum punya tone itu → silently fallback ke neutral (nggak ijo). Ditambahin `ok: 'bg-ok-dim text-ok'` ke `TONE_CLASS`, sekarang 2 tempat ini beneran render ijo. Sisa halaman (Dashboard, PmPartHistoryPage, GanttUpcomingPanel, CriticalAlertsPanel, DataTable no-result) udah pakai `<EmptyState>` dari awal. **Exception disengaja (bukan pelanggaran):** `NotificationBell` dropdown (340px, terlalu kecil buat layout icon+title+desc, tetep teks ringkas biar sama sama state "Memuat...") dan hint inline di form `PartSupplierModal` (helper text di bawah Select, bukan empty-state block).

### 🟡 A6 — KPI badge glow masih agak dominan
- **Masalah:** badge biru/kuning/merah masih sedikit lebih narik mata dari value. Udah membaik pas ada data, tapi belum ideal.
- **Keputusan (usulan):** turunin shadow badge (`0_4px_12px_-5px`) + pastiin value `text-[30px]` tetap fokus utama.
- **Status:** ✅ selesai — 08 Sep 2026. Shadow geometri ditarik lebih rapat: `0_4px_12px_-5px` → `0_3px_8px_-6px` (blur & offset-y turun, spread lebih negatif/tertarik). Warna tetap dari token (`--accent`/`--ok`/`--warn`/`--danger`), `tokens.css` TIDAK disentuh (itu kontrak tampilan, ada larangan eksplisit ubah nilai di file itu). Value `text-[30px] font-semibold` udah dominan dari awal, nggak perlu diubah.

### 🟢 A7 — Typography scale kurang tegas
- **Masalah:** lompatan ukuran antar-level (heading 15px / value 30px / label 11px) agak flat. Hierarki bisa lebih dramatis.
- **Keputusan (usulan):** definisikan skala tetap di doc: display/heading/body/label/mono-caption. Terapin konsisten.
- **Status:** ⬜ belum

### 🟢 A8 — Spacing rhythm belum ada standar
- **Masalah:** gap antar section (`gap-5`), padding panel (`p-4.5`), gap grid (`gap-4`/`gap-y-6`) — kebanyakan konsisten tapi ada spot ad-hoc.
- **Keputusan (usulan):** kunci spacing scale (section 20px, panel pad 18px, grid gap 16px) sebagai konvensi.
- **Status:** ⬜ belum

### 🟢 A9 — Ikon SVG belum diaudit menyeluruh
- **Catatan:** lu pernah minta "ikon seperlunya, jangan apa-apa dikasih ikon" (revisi 3 Sep). Perlu pass khusus mastiin nggak over-icon.
- **Status:** ⬜ belum

### 🔴 A10 — Motion / transisi belum ada sistem (BIANG "MUI kerasa mahal")
- **Masalah:** state berubah patah-patah — data masuk langsung "loncat", tab switch instan, hover cuma warna. Ini alasan #1 kenapa Material Dashboard kerasa "hidup" & app kita kerasa "statis", BUKAN shadow-nya.
- **Sebar:** global — tiap interaksi (hover, tab, modal, page transition, data load, expand/collapse).
- **Akar:** nggak ada transition token & durasi baku. Sebagian komponen udah ada (`transition-all duration-200` di KpiCard) tapi ad-hoc, nggak konsisten.
- **Keputusan (usulan):** definisikan **motion scale** baku (lihat §6). Durasi standar (fast 150 / base 200 / slow 300), easing standar, dan pola wajib: hover lift, fade-in-on-mount, skeleton→content crossfade, modal enter/exit, tab indicator slide. Implementasi pure CSS/Tailwind (nol library) + opsional `framer-motion` cuma buat yang kompleks.
- **Status:** 🟡 SEBAGIAN — 08 Sep 2026. Pondasi (§6.1-6.3) LOCKED & jalan: token easing (`ease-standard`/`ease-decelerate`/`ease-accelerate`) di `tailwind.css` `@theme inline`, token durasi (`--duration-fast/base/slow/data`) sebagai plain CSS var di `:root` (BUKAN di `@theme` — ketemu Tailwind v4 nggak generate utility `duration-*` dari theme namespace custom, cuma `ease-*` yang didukung; kalau dipaksa taro di `@theme`, di-drop diam-diam tanpa error. Consumer pakai arbitrary value `duration-[var(--duration-slow)]`, TETAP 1 sumber kebenaran). `prefers-reduced-motion` WAJIB — diimplementasi di `global.css` (override universal `*`). Semua diverifikasi langsung dari CSS hasil build (`grep` cubic-bezier value & duration var), bukan asumsi. Pola yang UDAH jalan: modal/dialog enter-exit (duration-slow, easing beda enter/exit) & KpiCard fade-in-on-mount. **Sisa (belum dikerjain):** hover-lift audit row-level, stagger 40ms grid KPI, skeleton-crossfade audit, number count-up, tab-indicator-slide, status-change-flash — detail di `UI-POLISH-IMPLEMENTATION-PLAN.md` §3.2. — **INI yang paling ngefek ke "kesan premium"**

### 🟡 A11 — Kualitas data-viz belum konsisten
- **Masalah:** enterprise dashboard dinilai dari CHART & angka, bukan card. Donut udah bagus, tapi belum ada bahasa viz seragam (sparkline, progress ring, trend bar) lintas halaman. Ini keunggulan yang MUI JUSTRU nggak kasih (MUI tetap butuh lib chart terpisah) — peluang lu menang.
- **Keputusan (usulan):** tetapkan 1 lib (recharts kalau udah ada / atau SVG murni buat yang simpel) + pola warna viz = token status yang sama. Sparkline mini di KPI, progress ring per-part konsisten.
- **Status:** ⬜ belum (masuk Fase 3, butuh cek lib yang keinstall)

---

## 2. Yang SUDAH bagus (JANGAN diutak-atik)

Biar seimbang & nggak salah rombak:

- ✅ **Token architecture** — `tokens.css` → `tailwind.css` expose → komponen. Nol warna hardcoded liar. Fondasi terkuat lu.
- ✅ **Semantic color** — Danger/Warn/OK + `muted` buat null. Konsisten 14 halaman.
- ✅ **StatusBadge / OnTimeBadge / PercentBadge** — satu keluarga (dot + bg-dim + text). Tinggal dijadiin acuan badge lain.
- ✅ **Component separation** — `ui/` (generic) vs `components/` (domain). Bener, pertahankan.
- ✅ **State handling** DataTable (loading/refreshing/empty/no-result/error).
- ✅ **Semantic honesty** — NeedsData jujur, nggak ada angka karangan.

---

## 3. Rencana eksekusi (fase, urut aman)

### FASE 1 — PRIMITIVE (dampak terluas, kerjain duluan)
Perbaiki di sumber, propagasi otomatis:
1. `utils/formatDate.js` (fix A1) — **paling instan, mulai dari sini**
2. `ui/card.jsx` — radius + elevation final (fix A2, A3)
3. `ui/table` / `DataTable` — row height & cell (fix A4)
4. audit `ui/empty-state` pemakaian (fix A5)
5. `KpiCard` glow tuning (fix A6)

> Estimasi: begitu 1–3 beres, ~60% halaman ikut rapi TANPA disentuh.

### FASE 2 — DOMAIN (halaman mirip digarap bareng)
- Grup **Monitoring** (Part/Line/Monthly/Weekly): terapin DataTable baru, ketepatan inline, row padat.
- Grup **Master Data / Users / Inventory**: form + tabel.
- Grup **History / Audit Log**: tabel + formatDate.

### FASE 3 — GLOBAL POLISH
- Typography scale (A7), spacing rhythm (A8), icon pass (A9), dark theme final.

---

## 4. Keputusan yang di-LOCK (isi bareng sebelum koding)

| ID | Pertanyaan | Opsi | Keputusan | Tgl |
|----|------------|------|-----------|-----|
| D1 | Radius standar semua surface? | rounded-lg / **rounded-xl** | **rounded-xl** | 08 Sep 2026 |
| D2 | Shadow default? | flat-only / **hero boleh shadow** | **hero boleh shadow** (KpiCard exception) | 08 Sep 2026 |
| D3 | Format tanggal? | `DD MMM YYYY` / lain | **`DD MMM YYYY`** (+ `, HH:mm` buat datetime) | 08 Sep 2026 |
| D4 | Ketepatan di tabel Monitoring? | inline badge / baris-2 | **inline badge** | 08 Sep 2026 |
| D5 | Mulai dari file mana? | formatDate / card | **moot** — semua Fase 1 (A1-A6) udah tuntas, urutan eksekusi nggak lagi relevan | 08 Sep 2026 |

---

## 6. Motion Scale (LOCK sebelum implementasi A10)

Sistem gerak baku — semua transisi WAJIB ambil dari sini, jangan ad-hoc.

> **Status implementasi (08 Sep 2026):** §6.1 & 6.2 LOCKED & jalan di kode (`frontend/src/styles/tailwind.css` + `global.css`). **Catatan teknis penting:** token durasi (§6.1) TIDAK bisa lewat `@theme` Tailwind v4 (cuma `--ease-*` yang beneran generate utility class dari theme namespace custom — `--duration-*` di-drop diam-diam tanpa error/warning). Solusinya: durasi ditaro plain CSS var di `:root`, dipakai component via arbitrary value `duration-[var(--duration-slow)]` (BUKAN `duration-slow` — itu class kosong/nggak ada). Tetap 1 sumber kebenaran, cuma beda mekanisme dari easing. Semua diverifikasi langsung dari CSS hasil build.

### 6.1 Durasi (token)
| Nama | Nilai | Dipakai buat |
|------|-------|--------------|
| `fast` | 150ms | hover warna, focus ring, tooltip |
| `base` | 200ms | hover lift, tab switch, badge, button press |
| `slow` | 300ms | modal/drawer enter, page fade, expand/collapse |
| `data` | 400ms | angka count-up, bar/donut grow on load |

### 6.2 Easing
| Nama | Cubic-bezier | Dipakai |
|------|--------------|---------|
| `standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | mayoritas (masuk & keluar) |
| `decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | elemen MASUK (enter) |
| `accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | elemen KELUAR (exit) |

### 6.3 Pola wajib (pattern library)
1. ⬜ **Hover lift** (card/row interaktif): `-translate-y-0.5` + shadow naik, `base`. KpiCard udah punya ini dari Fase 1 (D2); belum diaudit buat elemen interaktif lain.
2. 🟡 **Fade-in-on-mount** (panel/section): opacity 0→1 + `translate-y-1`, `slow` `decelerate`. Stagger 40ms antar-kartu di grid (biar "mengalir"). **KpiCard udah** (fade-in + slide-in-from-bottom-2, `duration-slow`+`ease-decelerate`) — otomatis nempel ke semua ~14 halaman yang pakai KpiCard. **Stagger 40ms BELUM** (butuh index/posisi kartu, KpiCard dipanggil manual per-halaman bukan lewat `.map()`). Panel non-KPI juga belum.
3. ⬜ **Skeleton → content**: crossfade, jangan "loncat". Skeleton harus SE-BENTUK konten (udah diterapin di KpiCardSkeleton — jadiin standar). Belum diaudit ulang pasca Fase 1/2.
4. ⬜ **Number count-up**: angka KPI naik dari 0 → nilai, `data` durasi. (opsional, high-impact buat "kesan mahal"). Belum dikerjain — butuh JS state (nggak bisa CSS murni).
5. ⬜ **Tab indicator slide**: garis bawah tab geser, bukan muncul-hilang. Belum dikerjain.
6. ✅ **Modal/Drawer**: backdrop fade + panel slide/scale, `slow`. Exit `accelerate`. **Selesai** — `dialog.jsx`/`alert-dialog.jsx` tadinya `duration-200` mentah tanpa easing eksplisit, sekarang `duration-[var(--duration-slow)]` + `ease-decelerate` (enter) / `ease-accelerate` (exit).
7. ⬜ **Status change flash**: pas data berubah (mis. jadi DANGER), badge flash/pulse 1× buat narik perhatian. Belum dikerjain.
8. ✅ **Respect `prefers-reduced-motion`**: WAJIB. Semua animasi non-esensial di-disable kalau user set reduce motion (accessibility + anti mabok). **Selesai** — `global.css`, override universal `*`/`*::before`/`*::after`.

### 6.4 Aturan anti-lebay
- JANGAN animasiin semua. Motion buat: feedback, kontinuitas, hierarki. Bukan dekorasi.
- Durasi > 400ms buat UI interaktif = kerasa lemot. Jangan.
- Nol layout-shift: animasi transform/opacity aja, JANGAN width/height/top yang bikin reflow (kecuali expand/collapse yang emang perlu).

---

## 5. Changelog

| Tgl | Perubahan |
|-----|-----------|
| 2026-09-08 | Dok dibuat (Fase 0). Audit awal 9 temuan (A1–A9), 6 item "sudah bagus", rencana 3 fase. |
| 2026-09-08 | +A10 (Motion system, P1) & +A11 (data-viz, P2). Tambah §6 Motion Scale. Diskusi MUI vs polish → keputusan: TETAP stack, all-in polish. |
| 2026-09-08 | A2/D1 LOCKED & selesai: `rounded-xl` semua surface. Migrasi menyeluruh (bukan cuma `card.jsx`) — nemuin 19 panel hand-rolled di 9 file yang niru pola Card tapi belum ikut standar. Semua disamain, build diverifikasi (`npm run build` lolos, bundle tetap ~130KB). Exception atom kecil (alert strip, nav item, `<pre>` log) di-lock eksplisit sebagai bukan pelanggaran D1. |
| 2026-09-08 | A6 selesai: shadow badge KPI ditarik lebih rapat (`0_3px_8px_-6px`), lokal di `KpiCard.jsx`, `tokens.css` nggak disentuh. A5 selesai: 1 empty-state polos dibenerin ("Semua Line dalam status OK") + bug laten `tone="ok"` di `empty-state.jsx` yang selama ini nggak kepake ikut dibenerin. Build diverifikasi. |
| 2026-09-08 | A3/D2 LOCKED & selesai: elevation rule ditulis eksplisit di `DESIGN-TOKENS.md` §"Elevation rules" (sebelumnya "Unknown"). Nol perubahan kode, murni nutup gap dokumentasi. Sekalian dibersihkan: duplikat seluruh isi dokumen ini (bekas ke-paste dobel format plain-text, ±120 baris) yang ketemu sesi sebelumnya. |
| 2026-09-08 | A4/D4 LOCKED & selesai: ketepatan Monitoring ternyata UDAH inline badge dari sebelumnya (`pmLineColumns.jsx`) — dikonfirmasi, bukan dikerjain ulang. Yang dikerjain: samain cell padding `px-3 py-3`→`px-2.5 py-2.5` di `DataTable.jsx` (primitive, 11+ consumer) + `PmPartHistoryPage.jsx` + `ImportMasterDataTab.jsx` (2 tabel hand-rolled yang beda sendiri). Final sweep: 0 sisa `px-3`/`py-3` di elemen tabel manapun. Build diverifikasi lolos. **FASE 1 (PRIMITIVE) resmi TUNTAS 100%** — A1–A6 semua ✅, D1–D4 semua LOCKED. Lanjut FASE 2 (Domain: Monitoring/Master Data/History group). |
| 2026-09-08 | A1/D3 LOCKED & selesai: util `formatDate.js` udah lengkap dari awal, tapi 3 kolom lolos audit (`userManagementColumns.jsx` "Daftar Sejak"/"Last Login", `inventoryColumns.jsx` "Tanggal" movement) masih `new Date(...).toLocaleString('id-ID')` mentah → diganti `formatDateTime()`. D5 di-mark moot (Fase 1 udah tuntas semua, urutan eksekusi nggak relevan lagi). **Fase 1 (Primitive) 100% CLOSED — A1-A6 ✅, D1-D5 semua terjawab.** Mulai Fase 2 (Domain). |
| 2026-09-08 | **FASE 2 (DOMAIN) TUNTAS** — 2.1/2.3: unify `<FilterBar>` di `PmPartHistoryPage`/`PmLineHistoryPage`/`InventoryHistoryPage` (3 filter row hand-rolled yang beda dari primitive). 2.2: audit only, Master Data (form field/action-button/error-box) ternyata udah 100% konsisten dari awal, nol perubahan. Badge aksi Audit Log dikonfirmasi SENGAJA beda dari StatusBadge (keluarga badge kategori compact, bukan status-urgency) — nggak diseragamkan, itu bakal nurunin kualitas. Build diverifikasi lolos tiap langkah. |
| 2026-09-08 | **FASE 3 (MOTION) DIMULAI — SEBAGIAN.** §6.1/6.2 (durasi+easing) LOCKED & jalan. Ketemu isu teknis: Tailwind v4 nggak generate utility dari `--duration-*` theme namespace (cuma `--ease-*` yang didukung) — didrop diam-diam kalau dipaksa, ketauan cuma lewat grep CSS hasil build (nol string durasi ke-emit). Diperbaiki: durasi jadi plain CSS var `:root`, dipakai via arbitrary value `duration-[var(--duration-slow)]`. §6.3: item #6 (modal enter/exit, `dialog.jsx`/`alert-dialog.jsx`) & #8 (`prefers-reduced-motion`, `global.css`) SELESAI; item #2 (fade-in-on-mount) SEBAGIAN — `KpiCard` udah (propagasi otomatis ~14 halaman via primitive), stagger 40ms belum. Item #1/#3/#4/#5/#7 belum dikerjain — lihat detail status per-item di §6.3. A11 (data-viz) belum disentuh sama sekali. Semua klaim diverifikasi langsung dari CSS hasil build (`grep` literal cubic-bezier/ms value di `dist/assets/*.css` pasca `npm run build`), bukan asumsi. |
