// src/components/NotificationBell.jsx
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, PackageSearch, Wrench } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/id';
import { useNotifications } from '../hooks/useNotifications';

dayjs.extend(relativeTime);
dayjs.locale('id');

// Dropdown bell icon di Topbar (checklist §7 - fitur baru, sebelumnya
// notifikasi PM Part Danger & Inventory Order CUMA kekirim lewat email,
// gak ke-expose ke UI sama sekali - lihat notificationService.js).
//
// Data-nya READ-ONLY, gak ada aksi mark-as-read/dismiss - notification_log
// itu murni audit trail PENGIRIMAN EMAIL (skema-nya gak punya kolom
// read/unread PER USER), jadi badge angka di sini SENGAJA dilabeli "N
// notifikasi 24 jam terakhir", BUKAN "belum dibaca" - itu klaim yang gak
// bisa dibuktikan dari data yang beneran ada (lihat komentar lebih detail
// di notificationQueries.countRecentSince, backend).
//
// Custom dropdown (bukan Radix Popover/DropdownMenu) - gak ada dependency
// Radix buat itu ke-install di project ini (cuma react-dialog/select/
// tooltip/alert-dialog), daripada nambah 1 package baru cuma buat 1
// komponen kecil, dipake close-on-click-outside manual (pattern umum,
// bukan reinventing sesuatu yang rumit).
const TYPE_ICON = { PM_PART_DANGER: Wrench, INVENTORY_ORDER: PackageSearch };

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { data, isLoading } = useNotifications();

  const items = data?.items ?? [];
  const recentCount = data?.recent_24h_count ?? 0;

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifikasi"
        aria-expanded={open}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:bg-accent hover:text-foreground"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
        {recentCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-[var(--font-mono)] text-[10px] font-bold text-white">
            {recentCount > 9 ? '9+' : recentCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <h2 className="m-0 font-[var(--font-display)] text-sm font-semibold">Notifikasi</h2>
            <p className="m-0 mt-0.5 text-xs text-muted-foreground">
              {recentCount > 0 ? `${recentCount} dalam 24 jam terakhir` : 'Tidak ada notifikasi baru'}
            </p>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {isLoading && <div className="px-4 py-6 text-center text-sm text-[var(--text-faint)]">Memuat...</div>}
            {!isLoading && items.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-[var(--text-faint)]">Belum ada notifikasi.</div>
            )}
            {!isLoading &&
              items.map((item) => {
                const Icon = TYPE_ICON[item.type] || Bell;
                const content = (
                  <div className="flex items-start gap-3 border-b border-[var(--border-soft)] px-4 py-3 transition-colors last:border-b-0 hover:bg-accent">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--panel-3)] text-muted-foreground">
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium leading-snug">{item.title}</div>
                      {item.detail && <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</div>}
                      <div className="mt-0.5 text-[11px] text-[var(--text-faint)]">{dayjs(item.sent_at).fromNow()}</div>
                    </div>
                  </div>
                );
                return item.link ? (
                  <Link key={item.id} to={item.link} className="block no-underline" onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.id}>{content}</div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;