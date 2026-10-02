// src/pages/TvDashboardPage.jsx
// Dashboard TV area teknisi (1 layar, tanpa sidebar): status PM Part, Monthly,
// Weekly + daftar yang harus dikerjakan. Auto-refresh 60 detik, tanpa endpoint baru.
// Ukuran panel dibuat kecil & jumlah baris dibatasi supaya tidak ada yang kepotong.
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Package, ShieldAlert, AlertTriangle, CheckCircle2, ShieldCheck, WifiOff } from 'lucide-react';
import { useTvLineSummary, useTvPartSummary, useTvUpcoming, useTvSyncStatus } from '../hooks/useTvDashboard';

dayjs.locale('id');

const TONE = { OK: 'text-ok', WARNING: 'text-warn', DANGER: 'text-danger' };
const num = (v) => (v === undefined || v === null ? '-' : Number(v).toLocaleString('id-ID'));
const WORST = { DANGER: 0, WARNING: 1, OK: 2 };

function Clock() {
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <div className="font-[var(--font-display)] text-3xl font-semibold leading-none tabular-nums">{now.format('HH:mm:ss')}</div>
      <div className="mt-1 text-sm text-muted-foreground">{now.format('dddd, D MMMM YYYY')}</div>
    </div>
  );
}

function Kpi({ icon, label, value, cls }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl px-5 py-3 ${cls}`}>
      {icon}
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="font-[var(--font-display)] text-4xl font-semibold leading-tight tabular-nums text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Panel({ title, children, className = '' }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4 ${className}`}>
      <h2 className="m-0 mb-2 font-[var(--font-display)] text-lg font-semibold">{title}</h2>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

function MiniDonut({ title, unit, ok = 0, warning = 0, danger = 0 }) {
  const total = ok + warning + danger;
  const p = (n) => (total ? (n / total) * 100 : 0);
  const bg = total
    ? `conic-gradient(var(--ok) 0 ${p(ok)}%, var(--warn) ${p(ok)}% ${p(ok) + p(warning)}%, var(--danger) ${p(ok) + p(warning)}% 100%)`
    : 'var(--panel-3)';
  const rows = [['Sehat', ok, 'bg-ok'], ['Perlu Perhatian', warning, 'bg-warn'], ['Kritis', danger, 'bg-danger']];
  return (
    <Panel title={title}>
      <div className="flex h-full items-center justify-center gap-6">
        <div className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-full" style={{ background: bg }}>
          <div className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full bg-card">
            <div className="font-[var(--font-display)] text-2xl font-semibold leading-none">{total}</div>
            <div className="text-[11px] text-[var(--text-faint)]">{unit}</div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {rows.map(([label, v, dot]) => (
            <div key={label} className="flex items-center gap-2.5 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
              <span className="w-32 text-muted-foreground">{label}</span>
              <span className="font-[var(--font-display)] text-lg font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function AllGood({ text }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-ok">
      <ShieldCheck size={40} />
      <div className="text-lg font-medium">{text}</div>
    </div>
  );
}

function eta(date) {
  if (!date) return '-';
  const d = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
  return d < 0 ? `Lewat ${-d} hari` : d === 0 ? 'Hari ini' : `${d} hari lagi`;
}

function days(n) {
  if (n === null || n === undefined) return '-';
  return n < 0 ? `Lewat ${-n} hari` : `${n} hari`;
}

const Th = ({ children, right }) => (
  <th className={`border-b border-border px-2 py-1.5 font-[var(--font-mono)] text-xs font-normal uppercase text-[var(--text-faint)] ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);

function TvDashboardPage() {
  const line = useTvLineSummary();
  const part = useTvPartSummary();
  const upcoming = useTvUpcoming().data ?? [];
  const sync = useTvSyncStatus().data;

  const ld = line.data;
  const pd = part.data;
  const failed = (line.isError && !ld) || (part.isError && !pd);
  const stale = line.isError || part.isError;

  const topParts = (pd?.top_attention ?? []).slice(0, 10);
  const attention = [...(ld?.attention ?? [])]
    .sort((a, b) => Math.min(WORST[a.status_monthly], WORST[a.status_weekly]) - Math.min(WORST[b.status_monthly], WORST[b.status_weekly])
      || Math.min(a.sisa_hari_monthly ?? 99, a.sisa_hari_weekly ?? 99) - Math.min(b.sisa_hari_monthly ?? 99, b.sisa_hari_weekly ?? 99));
  const lineRows = attention.slice(0, 8);

  const dayCols = Array.from({ length: 8 }, (_, i) => {
    const d = dayjs().add(i, 'day');
    const items = upcoming.filter((u) => u.estimated_date === d.format('YYYY-MM-DD'));
    const worst = items.some((u) => u.status === 'DANGER') ? 'DANGER' : items.length ? 'WARNING' : null;
    return { key: d.format('YYYY-MM-DD'), label: d.format('ddd D'), count: items.length, worst };
  });

  return (
    <div className="grid h-screen grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-3 overflow-hidden bg-background p-4 text-foreground">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-3xl font-semibold">PM Monitoring - Area Teknisi</h1>
          <div className="text-sm text-muted-foreground">
            Last sync {sync?.last_synced_at ? dayjs(sync.last_synced_at).format('D MMM YYYY HH:mm') : '-'}
            {sync?.rows_synced ? ` (${num(sync.rows_synced)} data produksi)` : ''}
          </div>
        </div>
        <div className="flex items-center gap-6">
          {stale && <div className="flex items-center gap-2 rounded-lg bg-warn-dim px-3 py-2 text-sm text-warn"><WifiOff size={16} /> Data mungkin tidak terbaru</div>}
          <Clock />
        </div>
      </header>

      {failed ? (
        <div className="row-span-4 flex items-center justify-center rounded-2xl border border-border bg-card text-xl text-muted-foreground">
          Gagal memuat data. Mencoba lagi otomatis... (jika terus muncul, login ulang)
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3">
            <Kpi icon={<Package size={32} />} label="Total Part Monitoring" value={num(pd?.total_parts)} cls="bg-[var(--accent-dim)] text-[var(--accent)]" />
            <Kpi icon={<ShieldAlert size={32} />} label="Danger Part" value={num(pd?.status_danger)} cls="bg-danger-dim text-danger" />
            <Kpi icon={<AlertTriangle size={32} />} label="Warning Part" value={num(pd?.status_warning)} cls="bg-warn-dim text-warn" />
            <Kpi icon={<CheckCircle2 size={32} />} label="OK Part" value={num(pd?.status_ok)} cls="bg-ok-dim text-ok" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MiniDonut title="Status PM Part" unit="Part" ok={pd?.status_ok} warning={pd?.status_warning} danger={pd?.status_danger} />
            <MiniDonut title="Status PM Monthly" unit="Line" ok={ld?.monthly.OK} warning={ld?.monthly.WARNING} danger={ld?.monthly.DANGER} />
            <MiniDonut title="Status PM Weekly" unit="Line" ok={ld?.weekly.OK} warning={ld?.weekly.WARNING} danger={ld?.weekly.DANGER} />
          </div>

          <div className="grid min-h-0 grid-cols-[3fr_2fr] gap-3">
            <Panel title="Top 10 Part Perlu Perhatian">
              {topParts.length === 0 ? <AllGood text="Semua part aman" /> : (
                <table className="w-full border-collapse text-sm">
                  <thead><tr><Th>Line</Th><Th>Jig / Station</Th><Th>Drawing No</Th><Th right>Sisa Shot</Th><Th right>ETA PM</Th></tr></thead>
                  <tbody>
                    {topParts.map((p) => (
                      <tr key={p.part_id} className="border-b border-[var(--border-soft)]">
                        <td className="px-2 py-1 font-[var(--font-mono)]">{p.line_name}</td>
                        <td className="px-2 py-1">{p.jig_name || p.part_name}</td>
                        <td className="px-2 py-1 font-[var(--font-mono)]">{p.drawing_no}</td>
                        <td className={`px-2 py-1 text-right font-[var(--font-mono)] font-semibold ${TONE[p.status]}`}>{num(p.remaining_shot)}</td>
                        <td className="px-2 py-1 text-right">{eta(p.estimated_pm_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
            <Panel title="Line Perlu PM Monthly / Weekly">
              {lineRows.length === 0 ? <AllGood text="Semua line OK" /> : (
                <>
                  <table className="w-full border-collapse text-sm">
                    <thead><tr><Th>Line</Th><Th right>Monthly</Th><Th right>Weekly</Th></tr></thead>
                    <tbody>
                      {lineRows.map((l) => (
                        <tr key={l.line_id} className="border-b border-[var(--border-soft)]">
                          <td className="px-2 py-1 font-[var(--font-mono)]">{l.line_name}</td>
                          <td className={`px-2 py-1 text-right font-[var(--font-mono)] font-semibold ${TONE[l.status_monthly]}`}>{days(l.sisa_hari_monthly)}</td>
                          <td className={`px-2 py-1 text-right font-[var(--font-mono)] font-semibold ${TONE[l.status_weekly]}`}>{days(l.sisa_hari_weekly)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {attention.length > lineRows.length && <div className="pt-1 text-center text-xs text-[var(--text-faint)]">+{attention.length - lineRows.length} line lainnya</div>}
                </>
              )}
            </Panel>
          </div>

          <Panel title="Jadwal PM Part 7 Hari ke Depan">
            <div className="grid grid-cols-8 gap-2">
              {dayCols.map((d) => (
                <div key={d.key} className="rounded-xl bg-[var(--panel-2)] py-2 text-center">
                  <div className="font-[var(--font-mono)] text-xs uppercase text-[var(--text-faint)]">{d.label}</div>
                  <div className={`font-[var(--font-display)] text-2xl font-semibold ${d.worst ? TONE[d.worst] : 'text-[var(--text-faint)]'}`}>{d.count}</div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      <footer className="sr-only">Update otomatis tiap 60 detik</footer>
    </div>
  );
}

export default TvDashboardPage;
