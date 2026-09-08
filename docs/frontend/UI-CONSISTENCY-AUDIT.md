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
- **Keputusan (usulan):** bikin `src/utils/formatDate.js` → `04 Jul 2026` (dan `04 Jul 2026, 14:30` buat yang butuh jam). Pakai `dayjs` + locale `id` (udah keinstall, udah dipakai di GanttUpcomingPanel). **LOCK format:** `DD MMM YYYY`.
- **Status:** ⬜ belum

### 🔴 A2 — Radius nyampur (rounded-lg vs rounded-xl)
- **Masalah:** `KpiCard` = `rounded-xl` + shadow. `card.jsx` (semua panel) = `rounded-lg` + flat. Di satu halaman ada 2 "bahasa". Ini akar rasa "50% redesign".
- **Sebar:** SETIAP halaman yang punya KPI + panel (Dashboard, PM Part, PM Line).
- **Keputusan (usulan):** pilih SATU radius jadi standar. Rekomendasi gua: **`rounded-xl` buat semua surface** (Card + Kpi + NeedsData + panel), karena lu udah suka look KPI. Update `card.jsx` sekali → semua panel ikut. Alternatif hemat: turunin KpiCard ke `rounded-lg` (lebih sedikit propagasi).
- **Status:** ⬜ belum — **butuh keputusan lu**

### 🔴 A3 — Elevation policy nggak jelas (shadow vs flat)
- **Masalah:** `DESIGN-TOKENS.md` bilang "no shadow, layering only". Tapi KpiCard sekarang pakai shadow + hover lift (pengecualian yang belum didokumentasi resmi). Panel lain flat.
- **Keputusan (usulan):** tetapkan aturan eksplisit:
  - Surface interaktif / "hero" (KPI) → boleh `shadow-sm` + hover lift.
  - Surface pasif (panel isi, tabel) → flat, pisah pakai border + bg layering.
  Tulis di `DESIGN-TOKENS.md` biar nggak ambigu.
- **Status:** ⬜ belum

### 🟡 A4 — Row height tabel nggak seragam
- **Masalah:** Monitoring Monthly & Weekly row-nya TINGGI (ketepatan ditaro di baris ke-2 → tiap row makan 2 baris). PM Part lebih padat. Master Data beda lagi.
- **Sebar:** semua tabel (Monitoring, Master Data, Users, Inventory, History, Audit Log, ketepatan_attention).
- **Keputusan (usulan):** standarisasi lewat 1 komponen `DataTable` / `Table` primitive: cell padding `py-2.5`, header `text-[11px] uppercase mono`, hover `bg-panel-2`. Ketepatan jadi inline badge (bukan baris ke-2).
- **Status:** ⬜ belum

### 🟡 A5 — Empty state belum konsisten di luar dashboard
- **Masalah:** dashboard udah pakai `<EmptyState>` (abis fix kemarin). Tapi halaman lain (Monitoring "Semua Line OK", tabel kosong lain) mungkin masih teks polos.
- **Keputusan (usulan):** audit semua kondisi kosong → wajib `<EmptyState>` (icon + title + description). Primitive udah ada, tinggal dipakai.
- **Status:** ⬜ belum (perlu cek per halaman)

### 🟡 A6 — KPI badge glow masih agak dominan
- **Masalah:** badge biru/kuning/merah masih sedikit lebih narik mata dari value. Udah membaik pas ada data, tapi belum ideal.
- **Keputusan (usulan):** turunin shadow badge (`0_4px_12px_-5px`) + pastiin value `text-[30px]` tetap fokus utama.
- **Status:** ⬜ belum

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
- **Status:** ⬜ belum — **INI yang paling ngefek ke "kesan premium"**

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
| D1 | Radius standar semua surface? | rounded-lg / **rounded-xl** | _pending_ | — |
| D2 | Shadow default? | flat-only / **hero boleh shadow** | _pending_ | — |
| D3 | Format tanggal? | `DD MMM YYYY` / lain | _pending_ | — |
| D4 | Ketepatan di tabel Monitoring? | inline badge / baris-2 | _pending_ | — |
| D5 | Mulai dari file mana? | formatDate / card | _pending_ | — |

---

## 6. Motion Scale (LOCK sebelum implementasi A10)

Sistem gerak baku — semua transisi WAJIB ambil dari sini, jangan ad-hoc.

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
1. **Hover lift** (card/row interaktif): `-translate-y-0.5` + shadow naik, `base`.
2. **Fade-in-on-mount** (panel/section): opacity 0→1 + `translate-y-1`, `slow` `decelerate`. Stagger 40ms antar-kartu di grid (biar "mengalir").
3. **Skeleton → content**: crossfade, jangan "loncat". Skeleton harus SE-BENTUK konten (udah diterapin di KpiCardSkeleton — jadiin standar).
4. **Number count-up**: angka KPI naik dari 0 → nilai, `data` durasi. (opsional, high-impact buat "kesan mahal").
5. **Tab indicator slide**: garis bawah tab geser, bukan muncul-hilang.
6. **Modal/Drawer**: backdrop fade + panel slide/scale, `slow`. Exit `accelerate`.
7. **Status change flash**: pas data berubah (mis. jadi DANGER), badge flash/pulse 1× buat narik perhatian.
8. **Respect `prefers-reduced-motion`**: WAJIB. Semua animasi non-esensial di-disable kalau user set reduce motion (accessibility + anti mabok).

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

UI Consistency Audit — Monitoring PM Web
Status: Living document. Dibuat sebagai Fase 0 dari "rapiin seluruh UI". Prinsip: Design-system-first. Perbaiki PRIMITIVE (ui/) sekali → propagasi ke semua halaman otomatis. JANGAN poles per-halaman satu-satu. Aturan main: setiap keputusan (kolom "Keputusan") harus di-LOCK sebelum ngoding. Sekali lock, jadi sumber kebenaran — halaman baru wajib ikut.

Sumber audit: 18 screenshot (Dashboard, PM Part/Line/Monthly/Weekly, Master Data, Inventory, Settings, Users, Recycle Bin, Audit Log, Profile, History) + codebase FE yang sudah dikirim (KpiCard, LineStatusDonut, CriticalAlertsPanel, GanttUpcomingPanel, DashboardPage, card.jsx, empty-state.jsx, StatusBadge, dll).

0. Legenda prioritas
Tanda	Arti
🔴 P1	Paling keliatan "nggak niat" / propagasi luas. Kerjain duluan.
🟡 P2	Kerasa, tapi nggak bikin app keliatan rusak.
🟢 P3	Nice-to-have. Poles akhir.
1. Temuan inkonsistensi (dari yang paling parah)
🔴 A1 — Format tanggal mentah
Masalah: History PM Part/Line nampilin 2026-07-04T17:00:00.000Z (ISO mentah). Paling "nggak enterprise" dari semua screenshot.
Sebar: semua tabel yang ada kolom tanggal (History, Audit Log, Inventory History, detail part last_tgl_ganti).
Akar: nggak ada util format tanggal terpusat. Tiap tempat render Date apa adanya.
Keputusan (usulan): bikin src/utils/formatDate.js → 04 Jul 2026 (dan 04 Jul 2026, 14:30 buat yang butuh jam). Pakai dayjs + locale id (udah keinstall, udah dipakai di GanttUpcomingPanel). LOCK format: DD MMM YYYY.
Status: ⬜ belum
🔴 A2 — Radius nyampur (rounded-lg vs rounded-xl)
Masalah: KpiCard = rounded-xl + shadow. card.jsx (semua panel) = rounded-lg + flat. Di satu halaman ada 2 "bahasa". Ini akar rasa "50% redesign".
Sebar: SETIAP halaman yang punya KPI + panel (Dashboard, PM Part, PM Line).
Keputusan (usulan): pilih SATU radius jadi standar. Rekomendasi gua: rounded-xl buat semua surface (Card + Kpi + NeedsData + panel), karena lu udah suka look KPI. Update card.jsx sekali → semua panel ikut. Alternatif hemat: turunin KpiCard ke rounded-lg (lebih sedikit propagasi).
Status: ⬜ belum — butuh keputusan lu
🔴 A3 — Elevation policy nggak jelas (shadow vs flat)
Masalah: DESIGN-TOKENS.md bilang "no shadow, layering only". Tapi KpiCard sekarang pakai shadow + hover lift (pengecualian yang belum didokumentasi resmi). Panel lain flat.
Keputusan (usulan): tetapkan aturan eksplisit:
Surface interaktif / "hero" (KPI) → boleh shadow-sm + hover lift.
Surface pasif (panel isi, tabel) → flat, pisah pakai border + bg layering. Tulis di DESIGN-TOKENS.md biar nggak ambigu.
Status: ⬜ belum
🟡 A4 — Row height tabel nggak seragam
Masalah: Monitoring Monthly & Weekly row-nya TINGGI (ketepatan ditaro di baris ke-2 → tiap row makan 2 baris). PM Part lebih padat. Master Data beda lagi.
Sebar: semua tabel (Monitoring, Master Data, Users, Inventory, History, Audit Log, ketepatan_attention).
Keputusan (usulan): standarisasi lewat 1 komponen DataTable / Table primitive: cell padding py-2.5, header text-[11px] uppercase mono, hover bg-panel-2. Ketepatan jadi inline badge (bukan baris ke-2).
Status: ⬜ belum
🟡 A5 — Empty state belum konsisten di luar dashboard
Masalah: dashboard udah pakai <EmptyState> (abis fix kemarin). Tapi halaman lain (Monitoring "Semua Line OK", tabel kosong lain) mungkin masih teks polos.
Keputusan (usulan): audit semua kondisi kosong → wajib <EmptyState> (icon + title + description). Primitive udah ada, tinggal dipakai.
Status: ⬜ belum (perlu cek per halaman)
🟡 A6 — KPI badge glow masih agak dominan
Masalah: badge biru/kuning/merah masih sedikit lebih narik mata dari value. Udah membaik pas ada data, tapi belum ideal.
Keputusan (usulan): turunin shadow badge (0_4px_12px_-5px) + pastiin value text-[30px] tetap fokus utama.
Status: ⬜ belum
🟢 A7 — Typography scale kurang tegas
Masalah: lompatan ukuran antar-level (heading 15px / value 30px / label 11px) agak flat. Hierarki bisa lebih dramatis.
Keputusan (usulan): definisikan skala tetap di doc: display/heading/body/label/mono-caption. Terapin konsisten.
Status: ⬜ belum
🟢 A8 — Spacing rhythm belum ada standar
Masalah: gap antar section (gap-5), padding panel (p-4.5), gap grid (gap-4/gap-y-6) — kebanyakan konsisten tapi ada spot ad-hoc.
Keputusan (usulan): kunci spacing scale (section 20px, panel pad 18px, grid gap 16px) sebagai konvensi.
Status: ⬜ belum
🟢 A9 — Ikon SVG belum diaudit menyeluruh
Catatan: lu pernah minta "ikon seperlunya, jangan apa-apa dikasih ikon" (revisi 3 Sep). Perlu pass khusus mastiin nggak over-icon.
Status: ⬜ belum
🔴 A10 — Motion / transisi belum ada sistem (BIANG "MUI kerasa mahal")
Masalah: state berubah patah-patah — data masuk langsung "loncat", tab switch instan, hover cuma warna. Ini alasan #1 kenapa Material Dashboard kerasa "hidup" & app kita kerasa "statis", BUKAN shadow-nya.
Sebar: global — tiap interaksi (hover, tab, modal, page transition, data load, expand/collapse).
Akar: nggak ada transition token & durasi baku. Sebagian komponen udah ada (transition-all duration-200 di KpiCard) tapi ad-hoc, nggak konsisten.
Keputusan (usulan): definisikan motion scale baku (lihat §6). Durasi standar (fast 150 / base 200 / slow 300), easing standar, dan pola wajib: hover lift, fade-in-on-mount, skeleton→content crossfade, modal enter/exit, tab indicator slide. Implementasi pure CSS/Tailwind (nol library) + opsional framer-motion cuma buat yang kompleks.
Status: ⬜ belum — INI yang paling ngefek ke "kesan premium"
🟡 A11 — Kualitas data-viz belum konsisten
Masalah: enterprise dashboard dinilai dari CHART & angka, bukan card. Donut udah bagus, tapi belum ada bahasa viz seragam (sparkline, progress ring, trend bar) lintas halaman. Ini keunggulan yang MUI JUSTRU nggak kasih (MUI tetap butuh lib chart terpisah) — peluang lu menang.
Keputusan (usulan): tetapkan 1 lib (recharts kalau udah ada / atau SVG murni buat yang simpel) + pola warna viz = token status yang sama. Sparkline mini di KPI, progress ring per-part konsisten.
Status: ⬜ belum (masuk Fase 3, butuh cek lib yang keinstall)
2. Yang SUDAH bagus (JANGAN diutak-atik)
Biar seimbang & nggak salah rombak:

✅ Token architecture — tokens.css → tailwind.css expose → komponen. Nol warna hardcoded liar. Fondasi terkuat lu.
✅ Semantic color — Danger/Warn/OK + muted buat null. Konsisten 14 halaman.
✅ StatusBadge / OnTimeBadge / PercentBadge — satu keluarga (dot + bg-dim + text). Tinggal dijadiin acuan badge lain.
✅ Component separation — ui/ (generic) vs components/ (domain). Bener, pertahankan.
✅ State handling DataTable (loading/refreshing/empty/no-result/error).
✅ Semantic honesty — NeedsData jujur, nggak ada angka karangan.
3. Rencana eksekusi (fase, urut aman)
FASE 1 — PRIMITIVE (dampak terluas, kerjain duluan)
Perbaiki di sumber, propagasi otomatis:

utils/formatDate.js (fix A1) — paling instan, mulai dari sini
ui/card.jsx — radius + elevation final (fix A2, A3)
ui/table / DataTable — row height & cell (fix A4)
audit ui/empty-state pemakaian (fix A5)
KpiCard glow tuning (fix A6)
Estimasi: begitu 1–3 beres, ~60% halaman ikut rapi TANPA disentuh.

FASE 2 — DOMAIN (halaman mirip digarap bareng)
Grup Monitoring (Part/Line/Monthly/Weekly): terapin DataTable baru, ketepatan inline, row padat.
Grup Master Data / Users / Inventory: form + tabel.
Grup History / Audit Log: tabel + formatDate.
FASE 3 — GLOBAL POLISH
Typography scale (A7), spacing rhythm (A8), icon pass (A9), dark theme final.
4. Keputusan yang di-LOCK (isi bareng sebelum koding)
ID	Pertanyaan	Opsi	Keputusan	Tgl
D1	Radius standar semua surface?	rounded-lg / rounded-xl	pending	—
D2	Shadow default?	flat-only / hero boleh shadow	pending	—
D3	Format tanggal?	DD MMM YYYY / lain	pending	—
D4	Ketepatan di tabel Monitoring?	inline badge / baris-2	pending	—
D5	Mulai dari file mana?	formatDate / card	pending	—
6. Motion Scale (LOCK sebelum implementasi A10)
Sistem gerak baku — semua transisi WAJIB ambil dari sini, jangan ad-hoc.

6.1 Durasi (token)
Nama	Nilai	Dipakai buat
fast	150ms	hover warna, focus ring, tooltip
base	200ms	hover lift, tab switch, badge, button press
slow	300ms	modal/drawer enter, page fade, expand/collapse
data	400ms	angka count-up, bar/donut grow on load
6.2 Easing
Nama	Cubic-bezier	Dipakai
standard	cubic-bezier(0.4, 0, 0.2, 1)	mayoritas (masuk & keluar)
decelerate	cubic-bezier(0, 0, 0.2, 1)	elemen MASUK (enter)
accelerate	cubic-bezier(0.4, 0, 1, 1)	elemen KELUAR (exit)
6.3 Pola wajib (pattern library)
Hover lift (card/row interaktif): -translate-y-0.5 + shadow naik, base.
Fade-in-on-mount (panel/section): opacity 0→1 + translate-y-1, slow decelerate. Stagger 40ms antar-kartu di grid (biar "mengalir").
Skeleton → content: crossfade, jangan "loncat". Skeleton harus SE-BENTUK konten (udah diterapin di KpiCardSkeleton — jadiin standar).
Number count-up: angka KPI naik dari 0 → nilai, data durasi. (opsional, high-impact buat "kesan mahal").
Tab indicator slide: garis bawah tab geser, bukan muncul-hilang.
Modal/Drawer: backdrop fade + panel slide/scale, slow. Exit accelerate.
Status change flash: pas data berubah (mis. jadi DANGER), badge flash/pulse 1× buat narik perhatian.
Respect prefers-reduced-motion: WAJIB. Semua animasi non-esensial di-disable kalau user set reduce motion (accessibility + anti mabok).
6.4 Aturan anti-lebay
JANGAN animasiin semua. Motion buat: feedback, kontinuitas, hierarki. Bukan dekorasi.
Durasi > 400ms buat UI interaktif = kerasa lemot. Jangan.
Nol layout-shift: animasi transform/opacity aja, JANGAN width/height/top yang bikin reflow (kecuali expand/collapse yang emang perlu).
5. Changelog
Tgl	Perubahan
2026-09-08	Dok dibuat (Fase 0). Audit awal 9 temuan (A1–A9), 6 item "sudah bagus", rencana 3 fase.
2026-09-08	+A10 (Motion system, P1) & +A11 (data-viz, P2). Tambah §6 Motion Scale. Diskusi MUI vs polish → keputusan: TETAP stack, all-in polish.
