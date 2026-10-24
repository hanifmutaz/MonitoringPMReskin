// src/components/LateLineEvidenceModal.jsx
//
// Evidence keterlambatan 1 Line - semuanya data sistem (bukan upload):
//   1. Yang terlambat sekarang: poin vs cap (Monthly/Weekly) / counter vs target (Part)
//   2. Output harian 14 hari terakhir dari production_cache
//   3. Riwayat PM telat 90 hari terakhir beserta PIC dan alasannya
import Modal from './Modal';
import { Skeleton } from './ui/skeleton';
import { useLateLineEvidence } from '../hooks/useDashboardExtras';
import { formatDate } from '../utils/formatDate';
import { LATE_TYPE_LABEL } from './LateLinesPanel';

const num = (v) => Number(v).toLocaleString('id-ID');

function LateItem({ item }) {
  const isPart = item.type === 'PM_PART';
  return (
    <li className="rounded-lg border border-border bg-[var(--panel-2)] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-medium">
          {isPart ? `${item.label} (${item.drawing_no})` : item.label}
          <span className="ml-2 text-[11px] font-normal text-[var(--text-faint)]">{LATE_TYPE_LABEL[item.type]}</span>
        </div>
        <div className="font-[var(--font-mono)] text-[13px] text-danger">
          {item.late_by_days === null ? 'Tidak terukur' : `Terlambat ${num(item.late_by_days)} hari`}
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {isPart ? (
          <>
            Counter {num(item.counter)} dari target {num(item.target_shot)} shot (lewat {num(item.over_shot)} shot,
            pemakaian {num(item.usage_per_day)} shot/hari). Terakhir diganti {formatDate(item.last_pm_date)}.
          </>
        ) : (
          <>
            Poin {num(item.poin_raw)} dari batas {num(item.poin_cap)}. PM terakhir {formatDate(item.last_pm_date)}.
          </>
        )}
      </div>
    </li>
  );
}

function OutputBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.output));
  return (
    <div>
      <div className="flex h-20 items-end gap-1" role="img" aria-label="Output produksi harian 14 hari terakhir">
        {data.map((d) => (
          <div key={d.tanggal} className="flex h-full flex-1 flex-col justify-end" title={`${formatDate(d.tanggal)}: ${num(d.output)} output`}>
            <div
              className={d.output > 0 ? 'rounded-t bg-primary' : 'rounded-t bg-danger/60'}
              style={{ height: d.output > 0 ? `${Math.max(6, (d.output / max) * 100)}%` : '4px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between font-[var(--font-mono)] text-[10px] text-[var(--text-faint)]">
        <span>{formatDate(data[0]?.tanggal)}</span>
        <span>{formatDate(data[data.length - 1]?.tanggal)}</span>
      </div>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">Batang merah tipis = hari tanpa output.</p>
    </div>
  );
}

function LateLineEvidenceModal({ lineId, lineName, onClose }) {
  const { data, isLoading, isError, refetch } = useLateLineEvidence(lineId);

  return (
    <Modal title={`Evidence Keterlambatan - ${lineName}`} onClose={onClose} width={720}>
      {isLoading && <Skeleton className="h-40 w-full" />}

      {isError && (
        <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
          Gagal memuat evidence.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>Coba lagi</button>
        </div>
      )}

      {data && (
        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
          {data.idle && (
            <div className="rounded-lg bg-[var(--panel-3)] px-3 py-2 text-xs text-muted-foreground">
              Line ini sedang <strong className="text-foreground">tidak running</strong> ({data.idle.idle_days} hari
              tanpa output
              {data.idle.never_ran ? ', belum pernah running' : `, terakhir running ${formatDate(data.idle.last_run_date)}`}
              ). PM yang terlambat tetap wajib dikerjakan.
            </div>
          )}

          <section aria-label="PM yang terlambat sekarang">
            <h3 className="mb-2 font-[var(--font-display)] text-sm font-semibold">Terlambat Saat Ini</h3>
            {data.late_now.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada PM yang terlambat saat ini (sudah dikerjakan).</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {data.late_now.map((item, i) => (
                  <LateItem key={`${item.type}-${item.label}-${i}`} item={item} />
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Output produksi harian">
            <h3 className="mb-2 font-[var(--font-display)] text-sm font-semibold">Output Harian ({data.daily_output.length} Hari Terakhir)</h3>
            <OutputBars data={data.daily_output} />
          </section>

          <section aria-label="Riwayat PM telat">
            <h3 className="mb-2 font-[var(--font-display)] text-sm font-semibold">Riwayat PM Telat (90 Hari Terakhir)</h3>
            {data.recent_late_events.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada PM yang dinilai telat dalam 90 hari terakhir.</p>
            ) : (
              <div className="overflow-x-auto" tabIndex="0" role="region" aria-label="Tabel riwayat PM telat (scroll horizontal)">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Tanggal', 'PM', 'PIC', 'Alasan Telat'].map((h) => (
                        <th key={h} scope="col" className="border-b border-border px-2 py-1.5 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_late_events.map((e, i) => (
                      <tr key={`${e.source}-${e.tanggal}-${i}`}>
                        <td className="border-b border-[var(--border-soft)] px-2 py-2 font-[var(--font-mono)] text-xs">{formatDate(e.tanggal)}</td>
                        <td className="border-b border-[var(--border-soft)] px-2 py-2 text-xs">{e.label}</td>
                        <td className="border-b border-[var(--border-soft)] px-2 py-2 text-xs">{e.pic_name || '-'}</td>
                        <td className="max-w-[260px] border-b border-[var(--border-soft)] px-2 py-2 text-xs text-[var(--text-dim)]">
                          {e.alasan_telat || <span className="text-[var(--text-faint)]">Tidak ada alasan (data sebelum fitur ini)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

export default LateLineEvidenceModal;
