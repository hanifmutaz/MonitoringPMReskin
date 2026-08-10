// src/components/Sidebar.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wrench, ClipboardList, Database, ShieldCheck, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useSidebar } from '../contexts/SidebarContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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
// 3. `--sidebar-width` naik jadi 300px (di tokens.css, riwayat: 230→280→300,
//    tiap kenaikan diminta eksplisit lewat chat) - 280px masih bikin
//    sub-item terpanjang ("Monitoring PM Monthly and Weekly") wrap 2 baris.
// 4. Collapse/expand icon-only (checklist §4, diputuskan "sekarang" via
//    chat) - state `collapsed` sekarang di `SidebarContext` (BUKAN lokal
//    lagi - lihat poin 5), persist ke localStorage (logic-nya di context).
//    Pas collapsed: lebar sidebar nyusut ke 76px, label+chevron+sub-item
//    nav disembunyiin, logo & footer user nyusut ke icon-only, tiap grup
//    nav dibungkus Tooltip (hover nampilin label). Klik grup pas collapsed
//    = auto-expand sidebar + langsung buka grup itu.
// 5. Tombol toggle collapse DIPINDAH KELUAR dari Sidebar ke Topbar (feedback
//    via chat + referensi Mantis: hamburger-nya emang di topbar, bukan di
//    sidebar). Makanya state collapsed diangkat ke `SidebarContext` biar
//    Topbar bisa baca/ubah state yang sama - lihat `Topbar.jsx`. Sidebar
//    sekarang cuma BACA `collapsed` dari context, gak PUNYA tombolnya lagi.
// 6. Header sidebar (logo row) tingginya di-fix `h-[60px]` biar SEJAJAR
//    persis sama Topbar (`.topbar` CSS lama juga `height:60px`) - sebelumnya
//    beda tinggi (`py-5` = content-dependent) bikin garis border top gak
//    nyambung antara sidebar & topbar.
// 7. Overlay scrollbar tipis auto-hide buat nav (feedback: scrollbar bawaan
//    browser kegedean & selalu nongol) - CSS-nya di `.overlay-scroll`
//    (global.css), state `scrolling` di sini cuma nentuin kapan thumb-nya
//    kelihatan (pas discroll) vs transparan (3 detik setelah idle).
// 8. Logo & teks "PM Monitor" diperbesar (feedback: kekecilan) - logo
//    32px→40px, judul text-sm→text-base.
// 9. Jarak antar-grup nav (`NavGroup`) diperlonggar (feedback: kedempetan) -
//    mb-1.5→mb-2.5.
//
// Revisi lanjutan (feedback batch berikutnya - 3 bug visual):
// 10. BUG: jarak antar-`NavGroup` beda antara sidebar terbuka vs collapsed -
//     sebelumnya tiap item nyimpen `mb-2.5` SENDIRI-SENDIRI (baik di cabang
//     collapsed maupun expanded), jadi ada 2 sumber kebenaran yang gampang
//     drift. Sekarang spacing dipindah ke SATU tempat: wrapper `<div>` di
//     `<nav>` pakai `space-y-2.5`, NavGroup gak nyimpen margin sendiri lagi.
//     Konsisten dijamin secara struktural, bukan disamain manual dua kali.
// 11. BUG: markup NavGroup collapsed vs expanded sebelumnya 2 CABANG RETURN
//     TERPISAH (return awal buat collapsed) - pas sidebar di-toggle, React
//     unmount total lalu mount ulang struktur yang beda sama sekali, jadi
//     transisinya "meloncat" (gak ada animasi antar 2 struktur berbeda).
//     Sekarang disatuin jadi 1 struktur DOM yang sama buat kedua state -
//     yang beda cuma label/chevron di-fade (opacity) + disusutin
//     (max-width) via Tailwind, BUKAN di-unmount. Hasilnya collapse/expand
//     jadi 1 animasi mulus yang nyambung sama transisi lebar `<aside>`,
//     bukan swap kasar.
// 12. Tombol toggle collapse (yang di Topbar) icon-nya sekarang crossfade
//     (2 ikon ditumpuk, opacity di-transition) - bukan ganti ikon
//     instan/loncat. Lihat `Topbar.jsx`.
//
// Data/logic (routing, badgeCount dari useDashboardSummary, logout,
// isAdmin gating) TETAP SAMA - cuma markup/struktur nav yang berubah.

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
      { to: '/pm-part/form', label: 'Input Penggantian Part' },
      { to: '/pm-part/history', label: 'History PM Part' },
    ],
  },
  {
    key: 'pm-line',
    label: 'PM Monthly and Weekly',
    icon: ClipboardList,
    items: [
      { to: '/pm-line', label: 'Monitoring PM Monthly and Weekly', badgeKey: 'lines_critical' },
      { to: '/pm-line/form', label: 'Input PM Monthly/Weekly' },
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

function NavGroup({ group, isOpen, onToggle, isGroupActive, summary, collapsed }) {
  const Icon = group.icon;
  const expandedOpen = isOpen && !collapsed;

  const button = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expandedOpen}
      aria-label={group.label}
      className={`flex w-full cursor-pointer items-center rounded-lg border-0 bg-transparent text-sm no-underline transition-[background-color,color,padding,gap] duration-[250ms] ease-in-out ${
        // FIX: pas collapsed, gap HARUS 0 - label & chevron di bawah cuma
        // disusutin lebarnya jadi 0 (max-w-0), bukan di-unmount, tapi kalau
        // gap-3 tetap kepasang, flexbox masih ngasih jarak 12px ke tiap sisi
        // elemen ber-lebar-0 itu. Efeknya `justify-center` ngerata-tengahin
        // "icon + ruang kosong dari gap" (bukan icon doang), jadi icon
        // keliatan nempel ke kiri, gak bener-bener center. Icon-only jadi
        // gak butuh gap sama sekali karena cuma 1 elemen yang keliatan.
        collapsed ? 'justify-center gap-0 p-2.5' : 'justify-start gap-3 px-3 py-2.5'
      } ${
        // BUG (feedback via chat): grup yang lagi AKTIF (biasanya "Dashboard"
        // karena itu landing page) sebelumnya SAMA SEKALI gak punya class
        // `hover:*` - dikira "gak ke-hover" padahal emang gak ada hover
        // state-nya. Sekarang tetap dikasih hover tipis (`hover:bg-accent`
        // di atas warna aktif) biar konsisten sama grup lain, bukan
        // ngilangin bg aktifnya.
        isGroupActive
          ? collapsed
            ? // `hover:bg-[var(--accent-dim)]/80` GAK dipakai - Tailwind gak
              // bisa nerapin opacity modifier ke arbitrary `var(...)`
              // (dicek manual di dist CSS: hasilnya identik sama base color,
              // hover jadi keliatan "gak ngaruh" lagi). Pakai literal rgba
              // langsung (--accent-dim base-nya rgba(76,141,255,.14), ini
              // versi lebih pekat buat state hover).
              'bg-[var(--accent-dim)] text-primary hover:bg-[rgba(76,141,255,0.24)]'
            : 'font-medium text-primary hover:bg-accent'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
      {/* Label & chevron TETAP di-render selalu (gak di-unmount pas
          collapsed) - cuma disusutin lewat max-width+opacity. Ini yang
          bikin transisi collapse/expand nyambung mulus sama animasi lebar
          `<aside>`, bukan pop instan kayak sebelumnya (poin 11). */}
      <span
        className={`overflow-hidden whitespace-nowrap text-left transition-[max-width,opacity] duration-[250ms] ease-in-out ${
          collapsed ? 'max-w-0 opacity-0' : 'max-w-[170px] flex-1 opacity-100'
        }`}
      >
        {group.label}
      </span>
      <ChevronDown
        className={`shrink-0 text-[var(--text-faint)] transition-[transform,max-width,opacity] duration-[250ms] ease-in-out ${
          expandedOpen ? 'rotate-180' : ''
        } ${collapsed ? 'max-w-0 opacity-0' : 'h-4 max-w-4 opacity-100'}`}
        strokeWidth={1.8}
      />
    </button>
  );

  return (
    <div>
      {collapsed ? (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{group.label}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}

      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-[250ms] ease-in-out ${
          expandedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
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

  const { collapsed, setCollapsed } = useSidebar();

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

  // Dipanggil dari NavGroup pas sidebar collapsed - klik icon grup langsung
  // expand sidebar + buka grup itu juga, daripada cuma expand doang terus
  // user harus klik dua kali.
  function handleGroupClickWhileCollapsed(key) {
    setCollapsed(false);
    setOpenGroups((prev) => new Set(prev).add(key));
  }

  // Overlay scrollbar nav: kelihatan pas discroll, transparan lagi abis 3
  // detik idle (lihat `.overlay-scroll` di global.css buat CSS-nya).
  const [navScrolling, setNavScrolling] = useState(false);
  const navScrollTimeoutRef = useRef(null);

  function handleNavScroll() {
    setNavScrolling(true);
    if (navScrollTimeoutRef.current) clearTimeout(navScrollTimeoutRef.current);
    navScrollTimeoutRef.current = setTimeout(() => setNavScrolling(false), 3000);
  }

  useEffect(() => {
    return () => {
      if (navScrollTimeoutRef.current) clearTimeout(navScrollTimeoutRef.current);
    };
  }, []);

  const initials = (user?.full_name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TooltipProvider>
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-[250ms] ease-in-out ${
          collapsed ? 'w-[76px]' : 'w-[var(--sidebar-width)]'
        }`}
      >
        <div
          className={`flex h-[60px] items-center gap-2.5 border-b border-border transition-[padding] duration-[250ms] ease-in-out ${collapsed ? 'justify-center px-2' : 'px-4'}`}
        >
          <img src="/logo.svg" alt="PM Monitor" className="h-10 w-10 shrink-0 object-contain" />
          {/* Title selalu di-render (gak di-unmount) - disusutin lewat
              max-width+opacity biar nyambung sama transisi lebar aside,
              bukan hilang instan (poin 11). */}
          <div
            className={`min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-[250ms] ease-in-out ${
              collapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
            }`}
          >
            <div className="truncate font-[var(--font-display)] text-base font-semibold leading-tight">
              PM Monitor
            </div>
            <div className="text-[11px] text-[var(--text-faint)]">Hirose Internal</div>
          </div>
        </div>

        <nav
          onScroll={handleNavScroll}
          className={`overlay-scroll flex-1 overflow-y-auto py-4 transition-[padding] duration-[250ms] ease-in-out ${navScrolling ? 'is-scrolling' : ''} ${
            collapsed ? 'px-2' : 'px-2.5'
          }`}
        >
          {/* Jarak antar-grup SATU sumber kebenaran (`space-y-2.5`) di sini -
              bukan `mb-2.5` per-item lagi (dulu ada 2 tempat berbeda buat
              collapsed vs expanded, gampang drift - poin 10). */}
          <div className="space-y-2.5">
            {NAV_GROUPS.filter((g) => !g.adminOnly || isAdmin).map((group) => (
              <NavGroup
                key={group.key}
                group={group}
                isOpen={openGroups.has(group.key)}
                onToggle={() => (collapsed ? handleGroupClickWhileCollapsed(group.key) : toggleGroup(group.key))}
                isGroupActive={group.key === activeGroupKey}
                summary={summary}
                collapsed={collapsed}
              />
            ))}
          </div>
        </nav>

        <div
          className={`flex items-center gap-2.5 border-t border-border py-3.5 transition-[padding] duration-[250ms] ease-in-out ${collapsed ? 'flex-col px-2' : 'px-4'}`}
        >
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[13px] font-bold text-primary">
            {initials}
          </div>
          {/* Beda dari title header di atas: kontainer footer ganti arah
              flex (row→column) pas collapsed, jadi trik max-width gak aman
              dipakai di sini (elemen width-0 di flex-col tetap makan tinggi
              buat teksnya). Dibiarkan unmount kayak semula - footer cuma
              berubah sekali pas collapsed (bukan elemen paling mencolok
              pas animasi), beda kasus sama header/NavGroup di atas. */}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{user?.full_name}</div>
              <div className="truncate text-[11.5px] text-[var(--text-faint)]">{user?.role}</div>
            </div>
          )}
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={logout}
                aria-label="Logout"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-danger"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Logout</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
