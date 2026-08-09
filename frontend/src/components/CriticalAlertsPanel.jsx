// src/components/CriticalAlertsPanel.jsx
// Reskin: props (items) & output visual PERSIS sama - cuma inline style
// diganti utility Tailwind. Kondisi danger vs warning (2 warna berbeda)
// ditulis sebagai 2 branch class statis, bukan interpolasi, biar ke-detect
// Tailwind JIT.
import { AlertTriangle } from 'lucide-react';

function AlertCard({ item }) {
  const isDanger = item.status === 'DANGER';

  return (
    <div
      className={
        isDanger
          ? 'mb-2 flex items-center justify-between rounded-sm border border-danger bg-danger-dim p-3.5'
          : 'mb-2 flex items-center justify-between rounded-sm border border-border bg-[var(--panel-2)] p-3.5'
      }
    >
      <div>
        <div className="font-[var(--font-mono)] text-[13px] font-semibold">{item.line_name}</div>
        <div className="text-xs text-muted-foreground">{item.part_name}</div>
      </div>
      <div className="text-right">
        <div className={`font-[var(--font-mono)] text-[13px] ${isDanger ? 'text-danger' : 'text-warn'}`}>
          sisa {item.remaining_shot.toLocaleString('id-ID')} shot
        </div>
        <div className="text-[11px] text-[var(--text-faint)]">{item.wear_percentage}% terpakai</div>
      </div>
    </div>
  );
}

function CriticalAlertsPanel({ items = [] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4.5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">
          <AlertTriangle size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
          Critical Alerts
        </h2>
      </div>
      {items.length === 0 ? (
        <div className="py-5.5 px-4 text-center text-[var(--text-faint)]">
          Gak ada part yang butuh perhatian saat ini.
        </div>
      ) : (
        items.map((item) => <AlertCard key={item.part_id} item={item} />)
      )}
    </div>
  );
}

export default CriticalAlertsPanel;
