// src/components/CriticalAlertsPanel.jsx
// Reskin: props (items) & output visual PERSIS sama - inline style diganti
// utility Tailwind. Kondisi danger vs warning ditulis 2 branch class statis.
//
// Empty state: pakai komponen EmptyState yang SUDAH dipakai di seluruh app.
// PENTING: EmptyState sendiri udah punya `border border-dashed` + `py-12`.
// Karena di sini dia dibungkus <div> yang UDAH ber-border (bg-card), tanpa
// override bakal jadi "kotak-dalam-kotak" (2 border) + ketinggian. Makanya
// dikasih `border-0 py-8` biar nyatu jadi isi panel, bukan box terpisah yang
// ngambang. Icon ShieldCheck + tone 'ok' karena "gak ada alert" = kondisi BAIK.
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { EmptyState } from './ui/empty-state';

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
    <div className="rounded-xl border border-border bg-card p-4.5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">
          <AlertTriangle size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
          Critical Alerts
        </h2>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          tone="ok"
          className="border-0 py-8"
          title="Tidak ada alert kritis"
          description="Semua part dalam kondisi aman. Alert muncul di sini saat ada part yang mendekati batas penggantian."
        />
      ) : (
        items.map((item) => <AlertCard key={item.part_id} item={item} />)
      )}
    </div>
  );
}

export default CriticalAlertsPanel;
