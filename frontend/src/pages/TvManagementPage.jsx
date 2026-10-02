// src/pages/TvManagementPage.jsx
// Dashboard TV Management (1 layar, tanpa sidebar). Layout mengikuti referensi
// desain, tanpa Inventory, dan hanya memakai data yang ada. Pakai hook dashboard
// yang sudah auto-refresh 60 detik, jadi tidak ada endpoint baru.
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Package, ShieldAlert, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { fetchSyncStatus } from '../api/dashboardApi';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useDashboardPartSummary, useDashboardKetepatanAttention, useDashboardUpcoming } from '../hooks/useDashboardExtras';
import LineStatusDonut from '../components/LineStatusDonut';
import GanttUpcomingPanel from '../components/GanttUpcomingPanel';

dayjs.locale('id');

const pct = (v) => (v === null || v === undefined ? '-' : `${v}%`);
const pctTone = (v) => (v === null || v === undefined ? 'text-muted-foreground' : v >= 90 ? 'text-ok' : v >= 50 ? 'text-warn' : 'text-danger');
const num = (v) => (v ?? '-').toLocaleString('id-ID');

function Panel({ title, children, className = '' }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4 ${className}`}>
      <h2 className="m-0 mb-3 font-[var(--font-display)] text-lg font-semibold">{title}</h2>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

function Kpi({ icon, label, value, tone }) {
  const t = { ok: 'bg-ok-dim text-ok', warn: 'bg-warn-dim text-warn', danger: 'bg-danger-dim text-danger', accent: 'bg-[var(--accent-dim)] text-[var(--accent)]' }[tone];
  return (
    <div className={`flex items-center gap-4 rounded-2xl px-5 py-4 ${t}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="font-[var(--font-display)] text-4xl font-semibold leading-tight tabular-nums text-foreground">{value}</div>
      </div>
    </div>
  );
}

function etaLabel(date) {
  if (!date) return '-';
  const d = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
  return d < 0 ? `Lewat ${-d} hari` : d === 0 ? 'Hari ini' : `${d} hari lagi`;
}

function Th({ children, right }) {
  return <th className={`border-b border-border px-2 py-1.5 font-[var(--font-mono)] text-xs uppercase text-[var(--text-faint)] ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}

function TvManagementPage() {
  const summary = useDashboardSummary().data;
  const part = useDashboardPartSummary().data;
  const ketepatan = useDashboardKetepatanAttention().data ?? [];
  const upcoming = useDashboardUpcoming().data ?? [];
  const sync = useQuery({ queryKey: ['dashboard', 'sync-status'], queryFn: fetchSyncStatus, refetchInterval: 60_000 }).data;

  const lines = (part?.per_line ?? []).slice(0, 8);
  const maxTotal = Math.max(1, ...lines.map((l) => l.OK + l.WARNING + l.DANGER));
  const top = (part?.top_attention ?? []).slice(0, 10);
  const bars = [['PM Part', summary?.ketepatan_pm_part_percentage], ['PM Monthly', summary?.ketepatan_pm_monthly_percentage], ['PM Weekly', summary?.ketepatan_pm_weekly_percentage]];

  return (
    <div className="grid h-screen grid-rows-[auto_auto_1fr_1fr_1fr] gap-3 overflow-hidden bg-background p-4 text-foreground">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-3xl font-semibold">Dashboard</h1>
          <div className="text-sm text-muted-foreground">Ringkasan kondisi PM di seluruh line</div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          Last sync <span className="font-semibold text-foreground">{sync?.last_synced_at ? dayjs(sync.last_synced_at).format('D MMM YYYY HH:mm') : '-'}</span>
          {sync?.rows_synced ? ` (${num(sync.rows_synced)} data produksi)` : ''}
        </div>
      </header>

      <div className="grid grid-cols-5 gap-3">
        <Kpi icon={<Package size={36} />} label="Total Part Monitoring" value={num(summary?.total_parts)} tone="accent" />
        <Kpi icon={<ShieldAlert size={36} />} label="Danger Part" value={num(summary?.status_danger)} tone="danger" />
        <Kpi icon={<AlertTriangle size={36} />} label="Warning Part" value={num(summary?.status_warning)} tone="warn" />
        <Kpi icon={<CheckCircle2 size={36} />} label="OK Part" value={num(summary?.status_ok)} tone="ok" />
        <Kpi icon={<Target size={36} />} label="Ketepatan PM Part" value={pct(summary?.ketepatan_pm_part_percentage)} tone="accent" />
      </div>

      <div className="grid min-h-0 grid-cols-3 gap-3">
        <Panel title="Status PM Part">
          <div className="flex h-full items-center justify-center">
            <LineStatusDonut healthy={summary?.status_ok ?? 0} warning={summary?.status_warning ?? 0} critical={summary?.status_danger ?? 0} totalLabel="Part" />
          </div>
        </Panel>
        <Panel title="Ketepatan PM (Tahun Berjalan)">
          <div className="flex h-full flex-col justify-center gap-5">
            {bars.map(([label, v]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-base"><span>{label}</span><span className={`font-semibold ${pctTone(v)}`}>{pct(v)}</span></div>
                <div className="h-3 rounded-full bg-[var(--panel-3)]"><div className="h-3 rounded-full bg-[var(--accent)]" style={{ width: `${v ?? 0}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Status Line (Monthly / Weekly)">
          <div className="flex h-full items-center justify-center">
            <LineStatusDonut healthy={summary?.lines_healthy ?? 0} warning={summary?.lines_warning ?? 0} critical={summary?.lines_critical ?? 0} totalLabel="Line" />
          </div>
        </Panel>
      </div>

      <div className="grid min-h-0 grid-cols-[3fr_2fr] gap-3">
        <Panel title="Top 10 Part Perlu Perhatian">
          <table className="w-full border-collapse text-sm">
            <thead><tr><Th>Line</Th><Th>Jig / Station</Th><Th>Drawing No</Th><Th right>Sisa Shot</Th><Th right>ETA PM</Th></tr></thead>
            <tbody>
              {top.map((p) => (
                <tr key={p.part_id} className="border-b border-[var(--border-soft)]">
                  <td className="px-2 py-1 font-[var(--font-mono)]">{p.line_name}</td>
                  <td className="px-2 py-1">{p.jig_name || p.part_name}</td>
                  <td className="px-2 py-1 font-[var(--font-mono)]">{p.drawing_no}</td>
                  <td className={`px-2 py-1 text-right font-[var(--font-mono)] font-semibold ${p.status === 'DANGER' ? 'text-danger' : 'text-warn'}`}>{num(p.remaining_shot)}</td>
                  <td className="px-2 py-1 text-right">{etaLabel(p.estimated_pm_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Line Ketepatan PM Terendah">
          <table className="w-full border-collapse text-sm">
            <thead><tr><Th>Line</Th><Th right>Part</Th><Th right>Monthly</Th><Th right>Weekly</Th></tr></thead>
            <tbody>
              {ketepatan.map((r) => (
                <tr key={r.line_id} className="border-b border-[var(--border-soft)]">
                  <td className="px-2 py-1.5 font-[var(--font-mono)]">{r.line_name}</td>
                  {[r.part_percentage, r.monthly_percentage, r.weekly_percentage].map((v, i) => (
                    <td key={i} className={`px-2 py-1.5 text-right font-[var(--font-mono)] font-semibold ${pctTone(v)}`}>{pct(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid min-h-0 grid-cols-[3fr_2fr] gap-3">
        <Panel title="Status per Line">
          <div className="flex flex-col justify-center gap-2.5">
            {lines.map((l) => {
              const total = l.OK + l.WARNING + l.DANGER;
              return (
                <div key={l.line_name} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 font-[var(--font-mono)] text-sm">{l.line_name}</span>
                  <div className="flex h-5 overflow-hidden rounded bg-[var(--panel-3)]" style={{ width: `${(total / maxTotal) * 100}%` }}>
                    <div className="bg-ok" style={{ width: `${(l.OK / total) * 100}%` }} />
                    <div className="bg-warn" style={{ width: `${(l.WARNING / total) * 100}%` }} />
                    <div className="bg-danger" style={{ width: `${(l.DANGER / total) * 100}%` }} />
                  </div>
                  <span className="font-[var(--font-mono)] text-sm font-semibold">{total}</span>
                </div>
              );
            })}
          </div>
        </Panel>
        <GanttUpcomingPanel items={upcoming} />
      </div>
    </div>
  );
}

export default TvManagementPage;
