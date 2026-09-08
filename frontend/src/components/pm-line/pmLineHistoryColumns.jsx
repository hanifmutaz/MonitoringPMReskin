// src/components/pm-line/pmLineHistoryColumns.jsx
// Fase 1 (A1/D3): kolom Tanggal pakai formatDate() -> "04 Jul 2026" (bukan
// tgl_input mentah). Sisanya tidak berubah.
import OnTimeBadge from '../OnTimeBadge';
import { formatDate } from '../../utils/formatDate';

const JENIS_LABEL = { MONTHLY: 'Monthly', WEEKLY: 'Weekly' };

const pmLineHistoryColumns = [
  {
    key: 'tgl_input',
    header: 'Tanggal',
    render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{formatDate(item.tgl_input)}</span>,
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
    key: 'keterangan',
    header: 'Keterangan',
    className: 'max-w-[240px] text-xs text-[var(--text-dim)]',
    render: (item) => item.keterangan || '-',
  },
  {
    key: 'oleh',
    header: 'Oleh',
    className: 'text-xs text-[var(--text-dim)]',
    render: (item) => item.user_full_name,
  },
];

export { JENIS_LABEL };
export default pmLineHistoryColumns;
