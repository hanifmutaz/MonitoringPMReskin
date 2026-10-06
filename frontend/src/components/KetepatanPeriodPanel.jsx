// src/components/KetepatanPeriodPanel.jsx
// Panel "Ketepatan PM" Dashboard PM Monthly and Weekly: SATU baris kartu, dikelompokkan
// per jenis PM, tiap jenis menampilkan BULAN INI lalu TAHUN BERJALAN berdampingan,
// jadi tren bulanan vs tahunan satu jenis langsung terbaca:
//   [Monthly - Bulan Ini] [Monthly - Tahun Ini] [Weekly - Bulan Ini] [Weekly - Tahun Ini]
//
// `ketepatan` datang dari backend (line_summary.ketepatan). Field ini BARU: site remote
// yang belum di-upgrade tidak mengirimnya, jadi kalau undefined komponen render null.
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Target } from 'lucide-react';
import KpiCard from './KpiCard';
import { Card, CardHeader, CardTitle } from './ui/card';

export const formatPct = (p) => (p === null || p === undefined ? '-' : `${p}%`);

export function ketepatanTone(p) {
  if (p === null || p === undefined) return 'muted';
  if (p >= 90) return 'accent';
  if (p >= 50) return 'warn';
  return 'danger';
}

export function ketepatanCaption(data, text, periodLabel) {
  if (!data || data.percentage === null || data.percentage === undefined) return `Belum ada event ${periodLabel}`;
  return `${text}, dari ${data.total} event`;
}

function monthLabel(monthKey) {
  const d = dayjs(`${monthKey}-01`);
  return d.isValid() ? d.locale('id').format('MMMM YYYY') : monthKey;
}

const PERIODS = [
  { field: 'bulan_ini', label: 'Bulan Ini', period: 'bulan ini' },
  { field: 'tahun_ini', label: 'Tahun Ini', period: 'tahun ini' },
];

/**
 * @param {{ketepatan?: {month: string} & Record<string, {bulan_ini: object, tahun_ini: object}>,
 *          items: {key: string, label: string, caption: string}[]}} props
 */
function KetepatanPeriodPanel({ ketepatan, items }) {
  if (!ketepatan) return null;
  // 4 kartu (2 jenis x 2 periode): 1 baris di layar lebar, 2 baris di layar sedang, 1 kolom di HP.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ketepatan PM (Bulan Ini: {monthLabel(ketepatan.month)})</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.flatMap((it) =>
          PERIODS.map((p) => {
            const d = ketepatan[it.key]?.[p.field];
            return (
              <KpiCard
                key={`${it.key}-${p.field}`}
                icon={<Target size={18} />}
                label={`${it.label} · ${p.label}`}
                value={formatPct(d?.percentage)}
                caption={ketepatanCaption(d, it.caption, p.period)}
                status={ketepatanTone(d?.percentage)}
              />
            );
          })
        )}
      </div>
    </Card>
  );
}

export default KetepatanPeriodPanel;
