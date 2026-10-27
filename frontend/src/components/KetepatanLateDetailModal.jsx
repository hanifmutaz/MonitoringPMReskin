// src/components/KetepatanLateDetailModal.jsx
//
// Detail "Ketepatan PM < 100%" 1 Line (dibuka dari panel Mode TV): PM mana yang dinilai telat di periode
// itu, telat berapa lama, siapa PIC-nya, dan alasan telatnya. Data = event PM telat yang SAMA dengan yang
// menurunkan persentase (periode & batas awal ketepatan sama), jadi daftarnya cocok dengan angka di panel.
//
// Alasan telat + catatan bisa dilengkapi belakangan (mis. data sebelum fitur alasan telat ada) lewat tombol
// di tiap kartu. Memakai dialog & endpoint edit history yang sudah ada (HistoryEditModal): hanya remark, PIC
// dan alasan telat yang berubah; tanggal/counter/ketepatan tidak tersentuh. Butuh permission submit PM terkait.
import { useState } from 'react';
import { Pencil } from 'lucide-react';
import Modal from './Modal';
import HistoryEditModal from './HistoryEditModal';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useTvKetepatanLateEvents } from '../hooks/useTvDashboard';
import { useUpdatePmLineHistory } from '../hooks/usePmLineHistory';
import { useUpdatePmPartHistory } from '../hooks/usePmPartHistory';
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
    <div className="grid grid-cols-3 gap-3">
      {rows.map((r) => (
        <div key={r.label} className="rounded-xl bg-[var(--panel-2)] px-4 py-3 text-center">
          <div className="text-sm text-[var(--text-faint)]">{r.label}</div>
          <div className={`font-[var(--font-display)] text-3xl font-semibold tabular-nums ${r.value === null || r.value === undefined ? 'text-muted-foreground' : r.value < 100 ? TONE_TEXT[belowTargetTone(r.value)] : 'text-ok'}`}>
            {pctLabel(r.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventCard({ e, canEdit, onEdit }) {
  const hasReason = typeof e.alasan_telat === 'string' && e.alasan_telat.trim() !== '';
  return (
    <li className="rounded-xl border border-border bg-[var(--panel-2)] px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-lg font-semibold">{e.label}</div>
        <div className="font-[var(--font-mono)] text-base font-semibold text-danger">{lateLabel(e.late)}</div>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        PM dikerjakan {formatDate(e.tanggal)} · PIC {e.pic_name || '-'}
        {e.source === 'PM_PART' && e.counter !== undefined && (
          <> · Counter {Number(e.counter).toLocaleString('id-ID')} dari target {Number(e.target_shot).toLocaleString('id-ID')} shot</>
        )}
      </div>
      <div className="mt-2 text-base">
        <span className="text-[var(--text-faint)]">Alasan telat: </span>
        <span className={hasReason ? 'text-foreground' : 'text-[var(--text-faint)]'}>{alasanLabel(e.alasan_telat)}</span>
      </div>
      {e.catatan && <div className="mt-1 text-sm text-muted-foreground">Catatan: {e.catatan}</div>}
      {canEdit && (
        <div className="mt-2.5">
          <Button type="button" size="sm" variant={hasReason ? 'outline' : 'default'} onClick={() => onEdit(e)}>
            <Pencil size={14} /> {hasReason ? 'Ubah alasan / catatan' : 'Tambah alasan & catatan'}
          </Button>
        </div>
      )}
    </li>
  );
}

// Event backend -> bentuk baris history yang dipahami HistoryEditModal (+ field remark sesuai jenisnya).
function toEditTarget(e) {
  const isPart = e.source === 'PM_PART';
  return {
    isPart,
    title: 'Alasan & Catatan PM Telat',
    subtitle: `${e.label} · PM dikerjakan ${formatDate(e.tanggal)}`,
    remarkField: isPart ? 'remark' : 'keterangan',
    remarkLabel: isPart ? 'Remark' : 'Keterangan',
    item: {
      id: e.id,
      on_time: false,
      pic_name: e.pic_name,
      alasan_telat: e.alasan_telat,
      [isPart ? 'remark' : 'keterangan']: e.catatan,
    },
  };
}

function KetepatanLateDetailModal({ item, period = 'month', onClose }) {
  const { data, isLoading, isError, refetch } = useTvKetepatanLateEvents(item.line_id, period);
  const { hasPermission } = useAuth();
  const lineMutation = useUpdatePmLineHistory();
  const partMutation = useUpdatePmPartHistory();
  const [editing, setEditing] = useState(null);

  const canEditEvent = (e) => e.id !== undefined && e.id !== null
    && hasPermission(e.source === 'PM_PART' ? 'pm_part.submit' : 'pm_line.submit');

  return (
    <>
      <Modal title={`Ketepatan PM - ${item.line_name} (${PERIOD_LABEL[period] ?? period})`} onClose={onClose} width="56rem">
        <div className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto pr-1">
          <Breakdown item={item} />

          <section aria-label="PM yang dinilai telat">
            <h3 className="mb-3 font-[var(--font-display)] text-lg font-semibold">
              PM Telat {data ? `(${data.events.length})` : ''}
            </h3>
            {isLoading && <Skeleton className="h-28 w-full" />}
            {isError && (
              <div className="rounded-lg bg-[var(--danger-dim)] px-4 py-3 text-sm text-[var(--danger)]">
                Gagal memuat detail.{' '}
                <button type="button" className="underline" onClick={() => refetch()}>Coba lagi</button>
              </div>
            )}
            {data && data.events.length === 0 && (
              <p className="text-sm text-muted-foreground">Tidak ada PM telat tercatat di periode ini.</p>
            )}
            {data && data.events.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {data.events.map((e, i) => (
                  <EventCard
                    key={`${e.source}-${e.tanggal}-${i}`}
                    e={e}
                    canEdit={canEditEvent(e)}
                    onEdit={(ev) => setEditing(toEditTarget(ev))}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </Modal>

      {editing && (
        <HistoryEditModal
          title={editing.title}
          subtitle={editing.subtitle}
          remarkField={editing.remarkField}
          remarkLabel={editing.remarkLabel}
          item={editing.item}
          mutation={editing.isPart ? partMutation : lineMutation}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

export default KetepatanLateDetailModal;
