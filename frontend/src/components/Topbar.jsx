// src/components/Topbar.jsx
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useCurrentPageHeader } from '../contexts/PageHeaderContext';
import { useSidebar } from '../contexts/SidebarContext';

// Tombol toggle sidebar pindah ke sini dari Sidebar.jsx (feedback via chat +
// referensi Mantis - hamburger-nya emang di topbar). Style-nya beda dari
// yang tadinya di Sidebar (dulu kotak bordered): di sini icon-only tanpa
// border (border cuma nongol pas hover, lihat poin di bawah), cuma hover
// background - ngikutin gaya tombol hamburger Mantis di topbar (bukan gaya
// tombol di dalam sidebar).
//
// Revisi (feedback batch berikutnya - 2 dari 3 bug visual, yang ke-3 ada di
// Sidebar.jsx):
// - BUG "ikon tutup/buka kelihatan dempet": tombolnya polos tanpa outline
//   apa pun di kondisi normal, jadi di tengah topbar yang lapang keliatan
//   kayak elemen ngambang gak jelas batasnya. Ditambah border tipis
//   transparan (`border-transparent`) yang baru keliatan pas hover/focus
//   (`hover:border-border`) - kasih tombolnya "wadah" yang jelas tanpa bikin
//   topbar rame pas idle. Gap ke judul halaman juga dilonggarin (gap-3→
//   gap-3.5).
// - BUG "animasi ganti ikon kasar": sebelumnya ikon di-ganti INSTAN lewat
//   ternary (PanelLeftOpen/PanelLeftClose gak pernah ada bareng - React
//   swap total). Sekarang KEDUA ikon di-render bareng ditumpuk (`absolute`
//   di atas 1 sama lain), yang keliatan cuma diatur lewat `opacity`
//   di-transition - jadi crossfade mulus, bukan loncat.
//
// Revisi (feedback ke-2, dari screenshot): "posisi icon tutup sidebar masih
// sama jauh [pas collapsed]" - padding-left header dibikin KONDISIONAL
// (16px collapsed / 32px expanded, di-override lewat inline style karena
// nilainya dinamis - Tailwind literal class gak bisa baca state React,
// lihat §7.1 RESKIN-PLAN.md) biar tombol toggle lebih deket ke sidebar pas
// collapsed. CATATAN: sidebar & topbar itu 2 kolom flex terpisah (lihat
// MainLayout.jsx) yang dibatasin border - gak akan pernah bener-bener
// segaris pixel-perfect sama kolom icon di dalam sidebar, tapi ini bikin
// jaraknya jauh lebih rapat & kerasa nyambung.
//
// Reskin penuh (checklist §3 item 2): class CSS lama `.topbar`/`.page-title`
// (di global.css) DILEPAS TOTAL dari elemen di bawah (§7.3 - gak digabung
// sama Tailwind), diganti Tailwind murni. Rule CSS-nya SENGAJA gak dihapus
// dari global.css - dead code dibiarin nganggur, sama kayak konvensi pas
// reskin Sidebar kemarin (`.sidebar`/`.nav-*`/`.brand-*` juga masih ada di
// situ walau udah gak dipakai elemen manapun). Height header disamain
// h-[60px] biar tetap pas sama tinggi header Sidebar (lihat poin di
// Sidebar.jsx). `actions` slot (tombol per-halaman, misal "Input PM" di
// History PM Line) SENGAJA gak disentuh - itu masih render `.btn`/
// `.btn-primary` dari page masing-masing, di luar scope Topbar, nanti
// kebagian pas reskin halaman itu sendiri (§3 item 4-6).
// Sticky topbar (feedback via chat, 12 Agustus): sebelumnya `<header>` ini
// cuma flex item biasa di dalam `.main-column` (lihat MainLayout.jsx) tanpa
// `position: sticky`, jadi dia ikut ke-scroll ke atas & hilang pas konten
// halaman lebih panjang dari viewport - beda sama Sidebar.jsx yang emang
// udah `position: sticky; top: 0` dari awal (lihat `.sidebar` di
// global.css). Fix: `sticky top-0 z-40 bg-background` - `bg-background`
// (token `--bg`, PERSIS sama warna body) WAJIB ada, bukan opsional,
// soalnya tanpa background solid, konten yang discroll di baliknya bakal
// "nembus" transparan pas topbar nempel di atas. z-40 dipilih di bawah
// Radix Dialog punya Modal.jsx (dia portal ke document.body + urutan DOM
// paling akhir, jadi otomatis di atas tanpa perlu z-index ekstrem di sini).
function Topbar() {
  const { title, actions } = useCurrentPageHeader();
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <header
      className="sticky top-0 z-40 flex h-[60px] shrink-0 items-center justify-between border-b border-border bg-background pr-8"
      style={{ paddingLeft: collapsed ? '16px' : '32px', transition: 'padding-left 250ms ease-in-out' }}
    >
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
          className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:bg-accent hover:text-foreground"
        >
          <PanelLeftOpen
            className={`absolute h-[18px] w-[18px] shrink-0 transition-opacity duration-[250ms] ease-in-out ${
              collapsed ? 'opacity-100' : 'opacity-0'
            }`}
            strokeWidth={1.8}
          />
          <PanelLeftClose
            className={`absolute h-[18px] w-[18px] shrink-0 transition-opacity duration-[250ms] ease-in-out ${
              collapsed ? 'opacity-0' : 'opacity-100'
            }`}
            strokeWidth={1.8}
          />
        </button>
        <h1 className="m-0 [font-family:var(--font-display)] text-[22px] font-semibold">{title}</h1>
      </div>
      {actions && <div>{actions}</div>}
    </header>
  );
}

export default Topbar;
