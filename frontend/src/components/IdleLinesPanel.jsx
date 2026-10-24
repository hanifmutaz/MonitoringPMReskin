// src/components/IdleLinesPanel.jsx
//
// Panel Dashboard "Line Tidak Running": Line tanpa output >= idle_min_days
// (Settings). Line ini TIDAK ikut Jadwal PM 7 Hari ke Depan. Cleaning wajib
// tiap idle_cleaning_interval_days, dihitung dari cleaning terakhir.
import { useState } from 'react';
import { PowerOff, SprayCan } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle } from './ui/card';
import { EmptyState } from './ui/empty-state';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import LineCleaningModal from './LineCleaningModal';
import { formatDate } from '../utils/formatDate';

function CleaningStatus({ item }) {
  if (item.cleaning_required) {
    const overdueDays = Math.abs(item.days_to_cleaning);
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger-dim px-2.5 py-0.5 text-xs text-danger">
        {overdueDays === 0 ? 'Wajib cleaning hari ini' : `Cleaning telat ${overdueDays} hari`}
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">
      Cleaning berikutnya {formatDate(item.cleaning_due_date)} ({item.days_to_cleaning} hari lagi)
    </span>
  );
}

function IdleLinesPanel({ data, isLoading }) {
  const { hasPermission } = useAuth();
  const canSubmit = hasPermission('pm_line.submit');
  const [cleaningFor, setCleaningFor] = useState(null);

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader><CardTitle>Line Tidak Running</CardTitle></CardHeader>
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  const { config, items } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <PowerOff size={16} />
          Line Tidak Running
          {items.length > 0 && (
            <span className="ml-1 rounded-full bg-[var(--panel-3)] px-2 py-0.5 font-[var(--font-mono)] text-[11px] text-muted-foreground">
              {items.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <p className="-mt-2 mb-3 text-xs text-muted-foreground">
        {config.enabled
          ? `Tanpa output minimal ${config.minDays} hari. Tidak masuk Jadwal PM 7 Hari ke Depan. Wajib cleaning setiap ${config.intervalDays} hari dari cleaning terakhir.`
          : 'Deteksi Line tidak running dinonaktifkan di Settings.'}
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon={PowerOff}
          tone="ok"
          className="border-0 py-8"
          title="Semua Line sedang running"
          description={`Tidak ada Line yang tanpa output selama ${config.minDays} hari atau lebih.`}
        />
      ) : (
        <div className="overflow-x-auto" tabIndex="0" role="region" aria-label="Tabel Line tidak running (scroll horizontal)">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Line', 'Tidak Running', 'Cleaning Terakhir', 'Status Cleaning', ...(canSubmit ? [''] : [])].map((h, i) => (
                  <th key={h || `aksi-${i}`} scope="col" className="border-b border-border px-2.5 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                    {h || <span className="sr-only">Aksi</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.line_id} className="hover:bg-[var(--panel-2)]">
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px]">{item.line_name}</td>
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5">
                    <div className="font-[var(--font-mono)] text-[13px]">{item.idle_days} hari</div>
                    <div className="text-[11px] text-[var(--text-faint)]">
                      {item.never_ran
                        ? 'Belum pernah running (dihitung sejak Line dibuat)'
                        : `Terakhir running ${formatDate(item.last_run_date)}`}
                    </div>
                  </td>
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 text-xs text-[var(--text-dim)]">
                    {item.last_cleaning_date ? formatDate(item.last_cleaning_date) : 'Belum pernah'}
                  </td>
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5"><CleaningStatus item={item} /></td>
                  {canSubmit && (
                    <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 text-right">
                      <Button type="button" size="sm" variant={item.cleaning_required ? 'default' : 'outline'} onClick={() => setCleaningFor(item)}>
                        <SprayCan size={13} />
                        Catat Cleaning
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cleaningFor && (
        <LineCleaningModal line={cleaningFor} onClose={() => setCleaningFor(null)} />
      )}
    </Card>
  );
}

export default IdleLinesPanel;
