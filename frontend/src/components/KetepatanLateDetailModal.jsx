// src/components/KetepatanLateDetailModal.jsx
//
// Detail "Ketepatan PM < 100%" 1 Line (dibuka dari panel Mode TV): PM mana yang dinilai telat di periode
// itu, telat berapa lama, siapa PIC-nya, dan alasan telatnya. Data = event PM telat yang SAMA dengan yang
// menurunkan persentase (periode & batas awal ketepatan sama), jadi daftarnya cocok dengan angka di panel.
import Modal from './Modal';
import { Skeleton } from './ui/skeleton';
import { useTvKetepatanLateEvents } from '../hooks/useTvDashboard';
import { formatDate } from '../utils/formatDate';
import { alasanLabel, lateLabel, pctLabel, belowTargetTone } from '../utils/ketepatanLate';

const PERIOD_LABEL = { month: 'Bulan Ini', year: 'Tahun Ini' };
const TONE_TEXT = { danger: 'text-danger', warn: 'text-warn' };

// Ringkasan persentase per jenis PM (Part / Monthly / Weekly) dari baris daftar. null = belum ada PM dinilai.
function Breakdown({ item }) {
  const rows = [
    { label: 'PM Part', value: item?.part_percentage },
    { label: 'PM Monthly', value: item?.monthly_percentage },
    { label: 'PM Weekly', value: item?.weekly_percentage },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {rows.map((r) => (
        <div key={r.label} className="rounded-lg bg-[var(--panel-2)] px-3 py-2 text-center">
          <div className="text-[11px] text-[var(--text-faint)]">{r.label}</div>
          <div className={`font-[var(--font-display)] text-lg font-semibold tabular-nums ${r.value === null || r.value === undefined ? 'text-muted-foreground' : r.value < 100 ? TONE_TEXT[belowTargetTone(r.value)] : 'text-ok'}`}>
            {pctLabel(r.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventCard({ e }) {
  const hasReason = typeof e.alasan_telat === 'string' && e.alasan_telat.trim() !== '';
  return (
    <li className="rounded-lg border border-border bg-[var(--panel-2)] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-medium">{e.label}</div>
        <div className="font-[var(--font-mono)] text-[13px] font-semibold text-danger">{lateLabel(e.late)}</div>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        PM dikerjakan {formatDate(e.tanggal)} · PIC {e.pic_name || '-'}
        {e.source === 'PM_PART' && e.counter !== undefined && (
          <> · Counter {Number(e.counter).toLocaleString('id-ID')} dari target {Number(e.target_shot).toLocaleString('id-ID')} shot</>
        )}
      </div>
      <div className="mt-1.5 text-xs">
        <span className="text-[var(--text-faint)]">Alasan telat: </span>
        <span className={hasReason ? 'text-foreground' : 'text-[var(--text-faint)]'}>{alasanLabel(e.alasan_telat)}</span>
      </div>
      {e.catatan && <div className="mt-0.5 text-xs text-muted-foreground">Catatan: {e.catatan}</div>}
    </li>
  );
}

function KetepatanLateDetailModal({ item, period = 'month', onClose }) {
  const { data, isLoading, isError, refetch } = useTvKetepatanLateEvents(item.line_id, period);

  return (
    <Modal title={`Ketepatan PM - ${item.line_name} (${PERIOD_LABEL[period] ?? period})`} onClose={onClose} width={640}>
      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
        <Breakdown item={item} />

        <section aria-label="PM yang dinilai telat">
          <h3 className="mb-2 font-[var(--font-display)] text-sm font-semibold">
            PM Telat {data ? `(${data.events.length})` : ''}
          </h3>
          {isLoading && <Skeleton className="h-24 w-full" />}
          {isError && (
            <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
              Gagal memuat detail.{' '}
              <button type="button" className="underline" onClick={() => refetch()}>Coba lagi</button>
            </div>
          )}
          {data && data.events.length === 0 && (
            <p className="text-xs text-muted-foreground">Tidak ada PM telat tercatat di periode ini.</p>
          )}
          {data && data.events.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {data.events.map((e, i) => <EventCard key={`${e.source}-${e.tanggal}-${i}`} e={e} />)}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}

export default KetepatanLateDetailModal;
