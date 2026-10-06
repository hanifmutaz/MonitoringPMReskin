// src/components/KetepatanPeriodPanel.jsx
// Panel "Ketepatan PM" dipakai Dashboard PM Part & Dashboard PM Monthly and Weekly.
// Menampilkan 2 baris KPI: BULAN INI (bulan kalender berjalan) dan TAHUN BERJALAN,
// supaya tren bulanan langsung kelihatan tanpa harus klik apa pun.
//
// `ketepatan` datang dari backend (part_summary.ketepatan / line_summary.ketepatan).
// Field ini BARU: site remote yang belum di-upgrade tidak mengirimnya, jadi kalau
// undefined komponen ini render null (bukan crash).
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

/**
 * @param {{ketepatan?: {month: string} & Record<string, {bulan_ini: object, tahun_ini: object}>,
 *          items: {key: string, label: string, caption: string}[]}} props
 */
function KetepatanPeriodPanel({ ketepatan, items }) {
  if (!ketepatan) return null;
  const cols = items.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

  const rows = [
    { id: 'bulan', title: `Bulan Ini (${monthLabel(ketepatan.month)})`, field: 'bulan_ini', period: 'bulan ini' },
    { id: 'tahun', title: 'Tahun Berjalan', field: 'tahun_ini', period: 'tahun ini' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ketepatan PM</CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-5">
        {rows.map((r) => (
          <section key={r.id} aria-label={`Ketepatan PM ${r.title}`}>
            <h3 className="m-0 mb-2.5 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
              {r.title}
            </h3>
            <div className={`grid grid-cols-1 gap-4 ${cols}`}>
              {items.map((it) => {
                const d = ketepatan[it.key]?.[r.field];
                return (
                  <KpiCard
                    key={it.key}
                    icon={<Target size={18} />}
                    label={it.label}
                    value={formatPct(d?.percentage)}
                    caption={ketepatanCaption(d, it.caption, r.period)}
                    status={ketepatanTone(d?.percentage)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}

export default KetepatanPeriodPanel;
