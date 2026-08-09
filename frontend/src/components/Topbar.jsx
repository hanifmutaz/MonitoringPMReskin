// src/components/Topbar.jsx
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useCurrentPageHeader } from '../contexts/PageHeaderContext';
import { useSidebar } from '../contexts/SidebarContext';

// Tombol toggle sidebar pindah ke sini dari Sidebar.jsx (feedback via chat +
// referensi Mantis - hamburger-nya emang di topbar). Style-nya beda dari
// yang tadinya di Sidebar (dulu kotak bordered): di sini icon-only tanpa
// border (border cuma nongol pas hover, lihat poin di bawah), cuma hover
// background - ngikutin gaya tombol hamburger Mantis di topbar (bukan gaya
// tombol di dalam sidebar). Topbar sendiri masih pakai class CSS lama
// (`.topbar`/`.page-title`, BELUM direskin - itu task terpisah), jadi cuma
// nambahin 1 elemen baru pakai Tailwind, gak nyentuh elemen yang udah ada.
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
function Topbar() {
  const { title, actions } = useCurrentPageHeader();
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <header className="topbar">
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
        <h1 className="page-title">{title}</h1>
      </div>
      {actions && <div>{actions}</div>}
    </header>
  );
}

export default Topbar;