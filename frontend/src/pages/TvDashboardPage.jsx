// src/pages/TvDashboardPage.jsx
// Dashboard mode TV untuk monitor area teknisi: PM Monthly, PM Weekly, PM Part
// dalam satu layar, tanpa sidebar/topbar, auto-refresh tiap 60 detik.
// Data dari endpoint yang sudah ada (/dashboard/line-summary & /part-summary),
// jadi tidak ada perubahan backend.
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { ShieldCheck, WifiOff } from 'lucide-react';
import { useTvLineSummary, useTvPartSummary } from '../hooks/useTvDashboard';

dayjs.locale('id');

const MAX_ROWS = 8;

const TONE = {
  OK: { text: 'text-ok', bg: 'bg-ok-dim', border: 'border-ok/30' },
  WARNING: { text: 'text-warn', bg: 'bg-warn-dim', border: 'border-warn/30' },
  DANGER: { text: 'text-danger', bg: 'bg-danger-dim', border: 'border-danger/40' },
};

function Clock() {
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <div className="font-[var(--font-display)] text-4xl font-semibold leading-none tabular-nums">{now.format('HH:mm:ss')}</div>
      <div className="mt-1 text-sm text-muted-foreground">{now.format('dddd, D MMMM YYYY')}</div>
    </div>
  );
}

function StatBox({ label, value, status }) {
  const cfg = TONE[status];
  return (
    <div className={`flex flex-1 flex-col items-center justify-center rounded-xl border px-3 py-4 ${cfg.bg} ${cfg.border}`}>
      <div className={`font-[var(--font-display)] text-6xl font-semibold leading-none tabular-nums ${cfg.text}`}>{value}</div>
      <div className="mt-2 text-sm font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function Column({ title, subtitle, counts, children }) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="m-0 font-[var(--font-display)] text-2xl font-semibold">{title}</h2>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      <div className="mb-4 flex gap-3">
        <StatBox label="OK" value={counts.ok} status="OK" />
        <StatBox label="Warning" value={counts.warning} status="WARNING" />
        <StatBox label="Danger" value={counts.danger} status="DANGER" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">{children}</div>
    </section>
  );
}

function AllGood({ text }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-ok">
      <ShieldCheck size={48} />
      <div className="text-lg font-medium">{text}</div>
    </div>
  );
}

function MoreNote({ count }) {
  if (count <= 0) return null;
  return <div className="pt-1 text-center text-sm text-[var(--text-faint)]">+{count} lainnya</div>;
}

function LineRow({ line, status, days }) {
  const cfg = TONE[status];
  const label = days === null || days === undefined ? '-' : days < 0 ? `Lewat ${Math.abs(days)} hari` : `${days} hari lagi`;
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${cfg.bg} ${cfg.border}`}>
      <span className="font-[var(--font-mono)] text-xl font-semibold">{line}</span>
      <span className={`font-[var(--font-mono)] text-lg font-semibold ${cfg.text}`}>{label}</span>
    </div>
  );
}

function PartRow({ item }) {
  const cfg = TONE[item.status] ?? TONE.WARNING;
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${cfg.bg} ${cfg.border}`}>
      <div className="min-w-0">
        <div className="font-[var(--font-mono)] text-lg font-semibold">{item.line_name}</div>
        <div className="truncate text-sm text-muted-foreground">{item.part_name}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`font-[var(--font-mono)] text-lg font-semibold ${cfg.text}`}>
          sisa {Number(item.remaining_shot).toLocaleString('id-ID')}
        </div>
        <div className="text-xs text-[var(--text-faint)]">{item.wear_percentage}% terpakai</div>
      </div>
    </div>
  );
}

function byUrgency(key) {
  // Danger dulu, lalu yang sisa harinya paling sedikit.
  return (a, b) => {
    const rank = (x) => (x[`status_${key}`] === 'DANGER' ? 0 : 1);
    return rank(a) - rank(b) || (a[`sisa_hari_${key}`] ?? 0) - (b[`sisa_hari_${key}`] ?? 0);
  };
}

function TvDashboardPage() {
  const line = useTvLineSummary();
  const part = useTvPartSummary();

  const lineData = line.data;
  const partData = part.data;
  const offline = (line.isError && !lineData) || (part.isError && !partData);
  const stale = line.isError || part.isError;

  const monthlyList = (lineData?.attention ?? [])
    .filter((l) => l.status_monthly === 'WARNING' || l.status_monthly === 'DANGER')
    .sort(byUrgency('monthly'));
  const weeklyList = (lineData?.attention ?? [])
    .filter((l) => l.status_weekly === 'WARNING' || l.status_weekly === 'DANGER')
    .sort(byUrgency('weekly'));
  const partList = partData?.top_attention ?? [];

  return (
    <div className="flex h-screen flex-col gap-4 overflow-hidden bg-background p-5 text-foreground">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="m-0 font-[var(--font-display)] text-3xl font-semibold">PM Monitoring - Area Teknisi</h1>
          <div className="text-sm text-muted-foreground">
            {lineData ? `${lineData.total_lines} line aktif` : 'Memuat data...'}
            {partData ? ` · ${partData.total_parts.toLocaleString('id-ID')} part dipantau` : ''}
          </div>
        </div>
        <div className="flex items-center gap-6">
          {stale && (
            <div className="flex items-center gap-2 rounded-lg bg-warn-dim px-3 py-2 text-sm text-warn">
              <WifiOff size={16} /> Data mungkin tidak terbaru
            </div>
          )}
          <Clock />
        </div>
      </header>

      {offline ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-border bg-card text-xl text-muted-foreground">
          Gagal memuat data. Mencoba lagi otomatis... (jika terus muncul, login ulang)
        </div>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-3 gap-4">
          <Column
            title="PM Monthly"
            subtitle="Status per line"
            counts={{ ok: lineData?.monthly.OK ?? '-', warning: lineData?.monthly.WARNING ?? '-', danger: lineData?.monthly.DANGER ?? '-' }}
          >
            {monthlyList.length === 0 ? (
              <AllGood text="Semua line OK" />
            ) : (
              <>
                {monthlyList.slice(0, MAX_ROWS).map((l) => (
                  <LineRow key={l.line_id} line={l.line_name} status={l.status_monthly} days={l.sisa_hari_monthly} />
                ))}
                <MoreNote count={monthlyList.length - MAX_ROWS} />
              </>
            )}
          </Column>

          <Column
            title="PM Weekly"
            subtitle="Status per line"
            counts={{ ok: lineData?.weekly.OK ?? '-', warning: lineData?.weekly.WARNING ?? '-', danger: lineData?.weekly.DANGER ?? '-' }}
          >
            {weeklyList.length === 0 ? (
              <AllGood text="Semua line OK" />
            ) : (
              <>
                {weeklyList.slice(0, MAX_ROWS).map((l) => (
                  <LineRow key={l.line_id} line={l.line_name} status={l.status_weekly} days={l.sisa_hari_weekly} />
                ))}
                <MoreNote count={weeklyList.length - MAX_ROWS} />
              </>
            )}
          </Column>

          <Column
            title="PM Part"
            subtitle="Part mendekati batas shot"
            counts={{ ok: partData?.status_ok ?? '-', warning: partData?.status_warning ?? '-', danger: partData?.status_danger ?? '-' }}
          >
            {partList.length === 0 ? (
              <AllGood text="Semua part aman" />
            ) : (
              <>
                {partList.slice(0, MAX_ROWS).map((p) => <PartRow key={p.part_id} item={p} />)}
                <MoreNote count={partList.length - MAX_ROWS} />
              </>
            )}
          </Column>
        </main>
      )}

      <footer className="text-center text-xs text-[var(--text-faint)]">
        Update otomatis tiap 60 detik{line.dataUpdatedAt ? ` · terakhir ${dayjs(line.dataUpdatedAt).format('HH:mm:ss')}` : ''}
      </footer>
    </div>
  );
}

export default TvDashboardPage;
