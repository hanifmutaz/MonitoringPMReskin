// src/components/GanttUpcomingPanel.jsx
// Reskin: props (items) & output visual PERSIS sama - inline style diganti
// utility Tailwind. Grid-template-columns tetap inline style karena jumlah
// kolom dihitung dinamis (DAYS_AHEAD + 1), bukan angka tetap yang bisa jadi
// utility class statis.
import dayjs from 'dayjs';
import 'dayjs/locale/id';

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
        <div className="py-5.5 px-4 text-center text-[var(--text-faint)]">
          Gak ada jadwal PM dalam 7 hari ke depan.
        </div>
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
