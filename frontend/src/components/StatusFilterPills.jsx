// src/components/StatusFilterPills.jsx
// Reskin (checklist §3 item 6 "PM pages", batch 1/N - shared component
// duluan karena dipakai di banyak PM page): `.btn` + inline style lama
// dilepas total, diganti Tailwind - visual & pola className PERSIS
// NGIKUTIN filter pill Aktif/Nonaktif di LinesTab.jsx/SuppliersTab.jsx
// (termasuk fix cursor-pointer yang sempet ketinggalan di situ), BUKAN
// gaya baru. Props (value, onChange) & daftar opsi TIDAK berubah.
import { cn } from '../lib/utils';

const OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'OK', label: 'OK', dotClass: 'bg-ok' },
  { value: 'WARNING', label: 'Warning', dotClass: 'bg-warn' },
  { value: 'DANGER', label: 'Danger', dotClass: 'bg-danger' },
];

function StatusFilterPills({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value || 'ALL'}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md border px-3.5 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-[var(--accent-dim)] text-primary'
                : 'border-border bg-[var(--panel-2)] text-[var(--text-dim)] hover:bg-secondary'
            )}
          >
            {opt.dotClass && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', opt.dotClass)} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default StatusFilterPills;
 