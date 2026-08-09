# Checklist Progress — Reskin PM-Monitoring

> Diturunkan dari `doc/reskin/RESKIN-PLAN.md` (per commit `c285f37` yang
> disebut dokumen, dan `RESKIN-PLAN.md` dibuat 9 Agustus 2026).
> Dokumen ini murni **ringkasan status**, bukan sumber kebenaran baru —
> kalau ada progres baru, update `RESKIN-PLAN.md` dulu, baru sinkronkan
> checklist ini.

**Ringkasan cepat:** Fase "infrastruktur + komponen kecil" **selesai**.
Fase "halaman-halaman besar" (Sidebar, Topbar, Dashboard layout, semua
tabel Master Data, PM Part/Line, User Management, Settings) **belum
dimulai sama sekali** — masih 100% tampilan lama. Dokumen plan-nya sendiri
juga masih berstatus **PERENCANAAN**, belum disetujui buat eksekusi.

---

## 0. Prasyarat sebelum eksekusi dimulai

- [ ] `RESKIN-PLAN.md` di-review & disetujui Mutaz (dokumen masih berstatus
      "PERENCANAAN" per catatan di baris paling atas file)
- [ ] Keputusan token warna diambil — **Opsi A** (pertahankan `tokens.css`
      apa adanya, default) vs **Opsi B** (update `--ok`/`--danger` doang)
- [ ] Keputusan search bar topbar: implementasi beneran (perlu scope
      backend search endpoint) atau skip dulu
- [ ] Keputusan notifikasi topbar: expose notification job yang sudah ada
      ke UI (dropdown/bell icon) atau tidak
- [x] Keputusan sidebar collapse ke icon-only: **dikerjakan sekarang** —
      selesai, lihat §3 & §4
- [ ] Keputusan sparkline KPI card: tunda sampai ada endpoint snapshot
      harian, atau dikerjain sekalian bikin endpoint baru

---

## 1. Infrastruktur (✅ Selesai)

- [x] Tailwind v4 via `@tailwindcss/vite`, scoped tanpa Preflight
      (`frontend/src/styles/tailwind.css`)
- [x] Semua warna Tailwind nunjuk ke `tokens.css` lewat `@theme inline`
- [x] shadcn/ui dasar: `Button`, `Dialog`, `AlertDialog`, `Select`,
      `Tooltip`, `Label`, `Input`
- [x] Helper `cn()` di `frontend/src/lib/utils.js`
- [x] Path alias `@/` → `frontend/src`

## 2. Komponen kecil (✅ Selesai)

- [x] `Modal.jsx` → `Dialog` (Radix), 9+ modal kebagian otomatis
- [x] `confirm()` browser → `useConfirm()` custom (`ConfirmDialogContext.jsx`)
- [x] `LoginPage.jsx` — full reskin (gaya "auth blob")
- [x] `RegisterPage.jsx` — full reskin, konsisten sama LoginPage
- [x] `KpiCard.jsx`
- [x] `StatusBadge.jsx`
- [x] `LineStatusDonut.jsx`
- [x] `CriticalAlertsPanel.jsx`
- [x] `GanttUpcomingPanel.jsx`

## 3. Halaman & layout besar (❌ Belum dimulai)

Urutan berikut sesuai rekomendasi §8 di `RESKIN-PLAN.md`:

- [x] **1. Sidebar** — reskin visual (ikon, active state, badge styling)
      selesai + FITUR TAMBAHAN: collapse/expand ke icon-only (state lokal +
      persist localStorage, tooltip pas collapsed) — awalnya direncanakan
      flat 5 grup/12 item TANPA collapsible, tapi berubah jadi grup
      accordion collapsible (lihat komentar di `Sidebar.jsx`) ditambah
      collapse icon-only di atas ini
- [ ] **2. Topbar** — reskin visual dasar dulu, TANPA search/notifikasi
      beneran (itu task terpisah setelah discovery backend)
- [ ] **3. `DashboardPage.jsx` layout** — lepas `.panel`/`.kpi-grid` lama,
      ganti Tailwind murni (komponen di dalamnya sudah siap dari §2)
- [ ] **4. Tabel Master Data** — `LinesTab`, `PartsTab`, `SuppliersTab`,
      `InventoryTab`: pola toolbar+search+row-actions+pagination
- [ ] **5. PM Part & PM Monthly/Weekly** — monitoring + history + form
- [ ] **6. User Management & Settings**
- [ ] **7. (Opsional, butuh diskusi scope)** Search bar, notifikasi,
      sparkline KPI, halaman 404

## 4. Item opsional / fase terpisah

- [x] Halaman 404 custom — udah ada catch-all route + `NotFoundPage.jsx`
- [x] Sidebar collapse ke icon-only
- [ ] Sparkline di KPI card (butuh endpoint data historis baru di backend)
- [ ] Search bar topbar (fitur baru, bukan reskin — perlu endpoint search
      lintas Part/Line/Supplier)
- [ ] Notifikasi topbar (expose `notificationJob` yang sudah ada ke UI)

## 5. Item yang tadinya di-skip di `RESKIN-PLAN.md` §6 — **KEBIJAKAN DIUBAH**

> ⚠️ **Update dari Mutaz (menggantikan §6 `RESKIN-PLAN.md`):**
> `dashboard-mockup.html` cuma referensi visual/pola, bukan pagar pembatas.
> Kalau ada bagian mockup yang polanya bisa diadaptasi atau **diambil
> sebagian** buat kebutuhan PM-Monitoring — walau app kita gak punya fitur
> itu secara harfiah — **ambil aja, jangan langsung skip total**. Berlaku
> ke SEMUA bagian mockup, bukan cuma invoice. Jadi item di bawah ini
> sekarang statusnya **"evaluasi dulu, jangan blanket-skip"**, bukan
> "definitely skip":

- [ ] **Invoice (List/Create/Detail/Edit)** — gak akan diimplementasikan
      sebagai fitur invoice beneran (gak relevan buat PM-Monitoring), TAPI
      cek dulu apa pola layoutnya (list+detail, form struktur) ada yang
      kepake buat History PM Part/Line atau halaman lain
- [ ] **Chat, Kanban, Customer, E-commerce** — evaluasi kalau ada pola UI
      yang applicable (misal Kanban buat visualisasi status PM per Line?)
- [ ] **Social media mini-cards** — kemungkinan besar tetap gak relevan,
      tapi cek dulu pola kartunya (bukan isinya)
- [ ] **Revenue chart, Traffic sources** — pola chart/progress bar-nya bisa
      dipakai buat metric lain yang relevan (bukan data finansial)
- [ ] **Org-pill ("Acme Corp")** — app single-tenant, kemungkinan besar
      tetap gak applicable
- [ ] **Wizard/Mask form** — cek lagi kalau ada form multi-step atau input
      format otomatis yang relevan (misal form PM Part yang panjang?)
- [ ] **Countdown timer, Coming Soon page** — prioritas rendah, evaluasi
      belakangan
- [ ] **Profile page lengkap** — bukan scope reskin murni (perlu endpoint
      baru), tapi pola visualnya bisa jadi referensi kalau nanti dibikin

---

## Catatan implementasi: aset visual (logo, ikon brand, dll)

Kalau di tahap Sidebar/Topbar (atau bagian lain) nanti butuh **logo, brand
mark, avatar placeholder**, atau gambar lain, pakai **file gambar asli**
(SVG/PNG), **bukan** direpresentasikan pakai font/icon-font/teks
placeholder. **On-demand, gak perlu disiapin dari sekarang** — pas
implementasi sampai ke titik yang butuh, akan dikasih tau spesifik apa
yang dibutuhkan (ukuran, format, di mana dipakai), baru Mutaz siapkan
fotonya. Ikon navigasi biasa (chevron, edit, hapus, dst) tetap boleh
pakai `lucide-react` (SVG component, sudah jadi dependency) — bedanya
cuma untuk logo/brand mark/foto spesifik, itu harus gambar asli.

---

## Aturan teknis wajib dipatuhi tiap batch kerja (dari §7 `RESKIN-PLAN.md`)

- [ ] Class Tailwind ditulis literal, gak lewat template-string dinamis
      (§7.1)
- [ ] Gak nulis pola `--nama-*` (wildcard) di komentar CSS (§7.2)
- [ ] Kalau reskin elemen yang masih pakai class lama (`.panel`, dst),
      LEPAS class lama-nya total, jangan digabung sama Tailwind (§7.3)
- [ ] Font arbitrary value kalau perlu: `[font-family:var(--font-display)]`,
      jangan `font-display` polos (§7.4)
- [ ] Sebelum declare selesai: `npx vite build`, scan className vs CSS
      output (§7.5)
- [ ] `git add -A && git commit && git push` setelah tiap batch kelar +
      ditest (§7.8)

---

*Update checklist ini tiap ada progres baru. Kalau ada perubahan keputusan
di §9 `RESKIN-PLAN.md`, sinkronkan ke bagian "Prasyarat" di atas.*