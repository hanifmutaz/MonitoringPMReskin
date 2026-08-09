// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Gauge,
  CalendarClock,
  Wrench,
  History,
  ClipboardList,
  Database,
  Package,
  PackageSearch,
  Settings as SettingsIcon,
  Users,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboardSummary';

// Reskin (RESKIN-PLAN.md §8 langkah 1): markup/className diganti Tailwind
// murni, LOGIC (routing, badgeCount, logout, isAdmin gating) PERSIS SAMA
// kayak sebelumnya - gak ada perubahan data/behavior. Class lama
// (.sidebar/.nav-item/.brand-mark/dst dari components.css & global.css)
// dilepas TOTAL dari elemen ini, bukan digabung dengan Tailwind - unlayered
// CSS lama itu akan selalu menang atas Tailwind utility kalau digabung
// (lihat §7.3 RESKIN-PLAN.md), jadi override gak akan kepake kalau class
// lama masih nempel.
//
// Struktur nav TETAP flat 5 grup / 12 item (BUKAN collapsible) - sesuai
// rekomendasi §5.1: mockup referensi (`dashboard-mockup.html`) punya
// puluhan item makanya butuh collapse per-grup, kita cuma 12 item jadi
// gak perlu.
//
// TODO(logo/foto): brand mark masih placeholder huruf "H" dalam kotak
// (pola yang sama kayak yang sudah dipakai di LoginPage.jsx/RegisterPage.jsx
// - lihat catatan TODO yang sama di sana). Begitu file logo asli (SVG/PNG)
// Hirose/PM Monitor tersedia, ganti div placeholder ini jadi <img>. JANGAN
// pakai icon-font untuk ini.

function NavItem({ to, icon: Icon, children, badgeCount }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
          isActive
            ? 'bg-[var(--accent-dim)] font-medium text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-primary" />}
          <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
          <span className="flex-1 truncate">{children}</span>
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

function NavGroupLabel({ children, first }) {
  return (
    <div
      className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--text-faint)] ${
        first ? 'mt-1' : 'mt-4'
      }`}
    >
      {children}
    </div>
  );
}

function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const { data: summary } = useDashboardSummary();

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

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <NavGroupLabel first>Dashboard</NavGroupLabel>
        <NavItem to="/" icon={LayoutDashboard}>
          Dashboard Management
        </NavItem>
        <NavItem to="/dashboard/pm-part" icon={Gauge}>
          Dashboard PM Part
        </NavItem>
        <NavItem to="/dashboard/pm-line" icon={CalendarClock}>
          Dashboard PM Monthly and Weekly
        </NavItem>

        <NavGroupLabel>PM Part</NavGroupLabel>
        <NavItem to="/pm-part" icon={Wrench} badgeCount={summary?.status_danger}>
          Monitoring PM Part
        </NavItem>
        <NavItem to="/pm-part/history" icon={History}>
          History PM Part
        </NavItem>

        <NavGroupLabel>PM Monthly and Weekly</NavGroupLabel>
        <NavItem to="/pm-line" icon={ClipboardList} badgeCount={summary?.lines_critical}>
          Monitoring PM Monthly and Weekly
        </NavItem>
        <NavItem to="/pm-line/history" icon={History}>
          History PM Monthly and Weekly
        </NavItem>

        <NavGroupLabel>Data</NavGroupLabel>
        <NavItem to="/master-data" icon={Database}>
          Master Data Part
        </NavItem>
        <NavItem to="/inventory" icon={Package}>
          Inventory
        </NavItem>
        <NavItem to="/inventory/history" icon={PackageSearch}>
          History Inventory
        </NavItem>

        {isAdmin && (
          <>
            <NavGroupLabel>Administrasi</NavGroupLabel>
            <NavItem to="/settings" icon={SettingsIcon}>
              Settings
            </NavItem>
            <NavItem to="/users" icon={Users}>
              User Management
            </NavItem>
          </>
        )}
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-danger"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
