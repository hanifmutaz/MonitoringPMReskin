// src/components/Sidebar.jsx
import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wrench,
  ClipboardList,
  Database,
  ShieldCheck,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboardSummary';

// Reskin lanjutan (revisi setelah feedback via chat):
// 1. FIX BUG: nav item ke-underline - kelewatan pas reskin pertama, elemen
//    <a>/NavLink browser default punya text-decoration:underline, CSS lama
//    yang nutupin ini (.nav-item{text-decoration:none}) udah dilepas waktu
//    reskin pertama tapi lupa ganti sama util Tailwind `no-underline`.
// 2. Grup nav diganti dari flat list + label statis, jadi PARENT (ikon +
//    label + chevron) yang bisa di-collapse/expand + SUB-ITEM di dalamnya -
//    pola diambil dari referensi mockup (grup "Invoice" di Mantis, lihat
//    screenshot yang dikasih user). Grup yang otomatis kebuka: grup yang
//    berisi route aktif saat ini. User bisa expand/collapse grup lain manual
//    (bukan accordion ketat - lebih dari satu grup boleh kebuka bareng).
// 3. `--sidebar-width` dinaikin ke 280px (dari 230px, di tokens.css) +
//    label item TIDAK di-truncate lagi (dulu `truncate` bikin "...") -
//    sekarang boleh wrap ke baris kedua kalau memang masih kurang lebar,
//    tapi dengan lebar baru harusnya muat 1 baris.
//
// Data/logic (routing, badgeCount dari useDashboardSummary, logout,
// isAdmin gating) TETAP SAMA - cuma markup/struktur nav yang berubah.
//
// TODO(logo): brand mark masih placeholder huruf "H" - ganti ke <img>
// begitu file logo asli tersedia (JANGAN icon-font, sesuai instruksi user).

const NAV_GROUPS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { to: '/', label: 'Dashboard Management' },
      { to: '/dashboard/pm-part', label: 'Dashboard PM Part' },
      { to: '/dashboard/pm-line', label: 'Dashboard PM Monthly and Weekly' },
    ],
  },
  {
    key: 'pm-part',
    label: 'PM Part',
    icon: Wrench,
    items: [
      { to: '/pm-part', label: 'Monitoring PM Part', badgeKey: 'status_danger' },
      { to: '/pm-part/history', label: 'History PM Part' },
    ],
  },
  {
    key: 'pm-line',
    label: 'PM Monthly and Weekly',
    icon: ClipboardList,
    items: [
      { to: '/pm-line', label: 'Monitoring PM Monthly and Weekly', badgeKey: 'lines_critical' },
      { to: '/pm-line/history', label: 'History PM Monthly and Weekly' },
    ],
  },
  {
    key: 'data',
    label: 'Data',
    icon: Database,
    items: [
      { to: '/master-data', label: 'Master Data Part' },
      { to: '/inventory', label: 'Inventory' },
      { to: '/inventory/history', label: 'History Inventory' },
    ],
  },
  {
    key: 'admin',
    label: 'Administrasi',
    icon: ShieldCheck,
    adminOnly: true,
    items: [
      { to: '/settings', label: 'Settings' },
      { to: '/users', label: 'User Management' },
    ],
  },
];

function SubNavItem({ to, children, badgeCount }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `group relative flex items-center gap-2 rounded-lg py-2.5 pl-5 pr-3 text-[13.5px] no-underline transition-colors ${
          isActive
            ? 'bg-[var(--accent-dim)] font-medium text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-primary" />}
          <span className="flex-1">{children}</span>
          {badgeCount > 0 && (
            <span className="rounded-full bg-danger px-[7px] py-px font-[var(--font-mono)] text-[10px] font-bold text-white">
              {badgeCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function NavGroup({ group, isOpen, onToggle, isGroupActive, summary }) {
  const Icon = group.icon;

  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-2.5 text-sm no-underline transition-colors ${
          isGroupActive
            ? 'font-medium text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`}
      >
        <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--text-faint)] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          strokeWidth={1.8}
        />
      </button>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ease-in-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 space-y-1 pt-1">
          {group.items.map((item) => (
            <SubNavItem key={item.to} to={item.to} badgeCount={item.badgeKey ? summary?.[item.badgeKey] : undefined}>
              {item.label}
            </SubNavItem>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const { data: summary } = useDashboardSummary();
  const location = useLocation();

  const activeGroupKey = useMemo(() => {
    const found = NAV_GROUPS.find((g) => g.items.some((item) => item.to === location.pathname));
    return found?.key;
  }, [location.pathname]);

  const [openGroups, setOpenGroups] = useState(() => new Set(activeGroupKey ? [activeGroupKey] : []));

  function toggleGroup(key) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const initials = (user?.full_name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="sticky top-0 flex h-screen w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent-dim)] font-[var(--font-display)] font-semibold text-primary">
          H
        </div>
        <div className="min-w-0">
          <div className="truncate font-[var(--font-display)] text-sm font-semibold leading-tight">PM Monitor</div>
          <div className="text-[11px] text-[var(--text-faint)]">Hirose Internal</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        {NAV_GROUPS.filter((g) => !g.adminOnly || isAdmin).map((group) => (
          <NavGroup
            key={group.key}
            group={group}
            isOpen={openGroups.has(group.key)}
            onToggle={() => toggleGroup(group.key)}
            isGroupActive={group.key === activeGroupKey}
            summary={summary}
          />
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-border px-4 py-3.5">
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[13px] font-bold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{user?.full_name}</div>
          <div className="truncate text-[11.5px] text-[var(--text-faint)]">{user?.role}</div>
        </div>
        <button
          type="button"
          onClick={logout}
          title="Logout"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-danger"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;