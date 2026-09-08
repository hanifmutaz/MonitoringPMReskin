// src/components/GanttUpcomingPanel.jsx
// Reskin: props (items) & output visual PERSIS sama - inline style diganti
// utility Tailwind. gridTemplateColumns tetap inline (kolom dinamis).
//
// Empty state: pakai EmptyState + `border-0 py-8` supaya nyatu jadi isi panel
// (bukan kotak-dalam-kotak yang ngambang - EmptyState default-nya udah punya
// border-dashed + py-12, dobel sama border panel ini). Icon CalendarCheck +
// tone default (netral): "gak ada jadwal 7 hari" itu informasional, bukan
// baik/buruk.
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { CalendarCheck } from 'lucide-react';
import { EmptyState } from './ui/empty-state';
dayjs.locale('id');

const DAYS_AHEAD = 7;

function buildColumns() {
  return Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => {
    const d = dayjs().add(i, 'day');
    return { key: d.format('YYYY-MM-DD'), label: d.format('ddd D') };
  });
}

function groupByLine(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.line_name)) map.set(item.line_name, []);
    map.get(item.line_name).push(item);
  }
  return Array.from(map.entries());
}

const STATUS_CLASS = { OK: 'bg-ok', WARNING: 'bg-warn', DANGER: 'bg-danger' };

function GanttUpcomingPanel({ items = [] }) {
  const columns = buildColumns();
  const rows = groupByLine(items);
  return (
    <div className="rounded-lg border border-border bg-card p-4.5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">
          Upcoming PM (7 Hari ke Depan)
        </h2>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          className="border-0 py-8"
          title="Belum ada jadwal PM"
          description="Tidak ada penggantian part terjadwal dalam 7 hari ke depan."
        />
      ) : (
        <div className="overflow-x-auto" tabIndex="0" role="region" aria-label="Jadwal PM 7 hari ke depan (scroll horizontal)">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `150px repeat(${columns.length}, 1fr)` }}
          >
            <div />
            {columns.map((col) => (
              <div
                key={col.key}
                className="py-1 text-center font-[var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.5px] text-[var(--text-faint)]"
              >
                {col.label}
              </div>
            ))}
            {rows.map(([lineName, lineItems]) => (
              <RowContent key={lineName} lineName={lineName} lineItems={lineItems} columns={columns} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RowContent({ lineName, lineItems, columns }) {
  return (
    <>
      <div className="py-2.5 font-[var(--font-mono)] text-xs text-muted-foreground">{lineName}</div>
      {columns.map((col) => {
        const dayItems = lineItems.filter((it) => it.estimated_date === col.key);
        return (
          <div
            key={col.key}
            className="flex items-center justify-center gap-1 border-l border-[var(--border-soft)] py-2"
          >
            {dayItems.map((it, idx) => (
              <span
                key={idx}
                title={`${it.label} (${it.status})`}
                className={`h-2 w-2 rounded-full ${STATUS_CLASS[it.status] || 'bg-[var(--text-faint)]'}`}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

export default GanttUpcomingPanel;
