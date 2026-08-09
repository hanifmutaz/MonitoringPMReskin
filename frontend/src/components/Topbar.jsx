// src/components/Topbar.jsx
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useCurrentPageHeader } from '../contexts/PageHeaderContext';
import { useSidebar } from '../contexts/SidebarContext';

// Tombol toggle sidebar pindah ke sini dari Sidebar.jsx (feedback via chat +
// referensi Mantis - hamburger-nya emang di topbar). Style-nya beda dari
// yang tadinya di Sidebar (dulu kotak bordered): di sini icon-only tanpa
// border, cuma hover background - ngikutin gaya tombol hamburger Mantis di
// topbar (bukan gaya tombol di dalam sidebar). Topbar sendiri masih pakai
// class CSS lama (`.topbar`/`.page-title`, BELUM direskin - itu task
// terpisah), jadi cuma nambahin 1 elemen baru pakai Tailwind, gak nyentuh
// elemen yang udah ada.
function Topbar() {
  const { title, actions } = useCurrentPageHeader();
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          )}
        </button>
        <h1 className="page-title">{title}</h1>
      </div>
      {actions && <div>{actions}</div>}
    </header>
  );
}

export default Topbar;