// src/components/pm-line/pmLineHistoryColumns.jsx
// Fase 1 (A1/D3): kolom Tanggal pakai formatDate() -> "04 Jul 2026" (bukan
// tgl_input mentah). Sisanya tidak berubah.
import { Pencil } from 'lucide-react';
import OnTimeBadge from '../OnTimeBadge';
import { Button } from '../ui/button';
import { formatDate, formatDateTime } from '../../utils/formatDate';

const JENIS_LABEL = { MONTHLY: 'Monthly', WEEKLY: 'Weekly' };

const baseColumns = [
  {
    key: 'tgl_input',
    header: 'Tanggal',
    render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{formatDate(item.tgl_input)}</span>,
  },
  {
    // Jam dicatat sistem saat submit (created_at), bukan input operator.
    key: 'waktu_input',
    header: 'Waktu Input',
    className: 'text-xs text-[var(--text-dim)]',
    render: (item) => formatDateTime(item.created_at),
  },
  {
    key: 'line',
    header: 'Line',
    render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{item.line_name}</span>,
  },
  {
    key: 'jenis',
    header: 'Jenis',
    render: (item) => <span className="text-[13px]">{JENIS_LABEL[item.jenis_pm]}</span>,
  },
  {
    key: 'pic',
    header: 'PIC',
    render: (item) => <span className="text-[13px]">{item.pic_name || '-'}</span>,
  },
  {
    key: 'ketepatan',
    header: 'Ketepatan',
    render: (item) => <OnTimeBadge onTime={item.on_time} />,
  },
  {
    key: 'alasan_telat',
    header: 'Alasan Telat',
    className: 'max-w-[240px] text-xs text-[var(--text-dim)]',
    render: (item) => item.alasan_telat || '-',
  },
  {
    key: 'keterangan',
    header: 'Keterangan',
    className: 'max-w-[240px] text-xs text-[var(--text-dim)]',
    render: (item) => item.keterangan || <span className="font-semibold text-warn">Belum diisi</span>,
  },
  {
    key: 'oleh',
    header: 'Oleh',
    className: 'text-xs text-[var(--text-dim)]',
    render: (item) => item.user_full_name,
  },
];

// Kolom Aksi (Edit Keterangan/PIC/Alasan Telat) hanya muncul kalau user punya hak input PM Line.
function getPmLineHistoryColumns({ onEdit } = {}) {
  if (!onEdit) return baseColumns;
  return [
    ...baseColumns,
    {
      key: 'aksi',
      header: '',
      srHeader: 'Aksi',
      render: (item) => (
        <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)} aria-label={`Edit riwayat ${item.line_name}`}>
          <Pencil size={13} />
          Edit
        </Button>
      ),
    },
  ];
}

export { JENIS_LABEL, getPmLineHistoryColumns };
export default baseColumns;
