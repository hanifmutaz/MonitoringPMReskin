// src/pages/TvDashboardPage.jsx
// Mode TV "PM Monitoring" (1 layar, tanpa sidebar): KPI part/line/inventory,
// prioritas hari ini, PM terdekat, top part perlu perhatian, jadwal PM 8 hari.
// Auto-refresh 60 detik, tanpa endpoint baru. Dibuka lewat tombol "Mode TV" di
// Topbar (route /tv). Ukuran & jumlah baris dibatasi supaya tidak kepotong.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import {
  Wrench, Package, ShieldAlert, AlertTriangle, CheckCircle2, CalendarClock, Boxes, Target,
  ClipboardList, Clock, Settings, CalendarDays, Info, WifiOff, Maximize, Minimize, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  useTvLineSummary, useTvPartSummary, useTvUpcoming, useTvSyncStatus, useTvSummary, useTvInventoryNeedOrder,
} from '../hooks/useTvDashboard';

dayjs.locale('id');

const num = (v) => (v === undefined || v === null ? '-' : Number(v).toLocaleString('id-ID'));
const WORST = { DANGER: 0, WARNING: 1, OK: 2 };
const TONE = { OK: 'text-ok', WARNING: 'text-warn', DANGER: 'text-danger' };
const PILL = { OK: 'bg-ok text-black', WARNING: 'bg-warn text-black', DANGER: 'bg-danger text-white' };
// Label status SERAGAM di semua tabel: OK / Warning / Danger.
const STATUS_LABEL = { OK: 'OK', WARNING: 'Warning', DANGER: 'Danger' };
// Warna jenis PM sengaja BEDA dari warna status (merah/oranye/hijau) dan saling
// berjauhan hue-nya (magenta vs cyan) biar kebaca jelas dari jauh di TV.
const TAG_TONE = { M: 'text-[#e040fb]', W: 'text-[#00bcd4]', P: 'text-[#94a3b8]' };
const JENIS_CHIP = {
  Monthly: 'bg-[#c026d3] text-white',
  Weekly: 'bg-[#0891b2] text-white',
};

// Jumlah baris tabel (PM Terdekat & Top Part): ?rows=N, default 15, disimpan di localStorage.
const ROW_OPTIONS = [10, 15, 20, 30];
const DEFAULT_ROWS = 15;
const ROWS_KEY = 'tv.rows';
const clampRows = (n) => (Number.isFinite(n) ? Math.min(50, Math.max(5, Math.round(n))) : DEFAULT_ROWS);
function readStoredRows() {
  try { return clampRows(Number(localStorage.getItem(ROWS_KEY)) || DEFAULT_ROWS); } catch { return DEFAULT_ROWS; }
}

// Skala UI mengikuti ukuran layar (basis 1920x1080 = 16px) supaya TV beda resolusi
// tetap proporsional. Semua ukuran Tailwind berbasis rem jadi ikut membesar/mengecil.
function useScaleToScreen() {
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.fontSize;
    const apply = () => {
      const px = Math.min(window.innerWidth / 120, window.innerHeight / 67.5);
      el.style.fontSize = `${Math.min(32, Math.max(11, px))}px`;
    };
    apply();
    window.addEventListener('resize', apply);
    return () => { window.removeEventListener('resize', apply); el.style.fontSize = prev; };
  }, []);
}

const dayDiff = (date) => dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');

function sisaLabel(n) {
  if (n === null || n === undefined) return '-';
  if (n < 0) return `Lewat ${-n} hari`;
  return n === 0 ? 'Hari ini' : `${n} hari`;
}

// Ketepatan PM (tahun berjalan) gabungan Part + Monthly + Weekly, dibobot jumlah data.
function overallCompliance(s) {
  if (!s) return null;
  const sets = [
    [s.ketepatan_pm_part_percentage, s.ketepatan_pm_part_total],
    [s.ketepatan_pm_monthly_percentage, s.ketepatan_pm_monthly_total],
    [s.ketepatan_pm_weekly_percentage, s.ketepatan_pm_weekly_total],
  ];
  let total = 0;
  let acc = 0;
  for (const [pct, tot] of sets) {
    const t = Number(tot) || 0;
    if (!t || pct === null || pct === undefined) continue;
    total += t;
    acc += Number(pct) * t;
  }
  return total ? acc / total : null;
}

// Gabungan line-summary.attention (yang non-OK) + upcoming (jadwal 7 hari), 1 baris per Line+Jenis.
function buildNextActions(attention, upcoming) {
  const map = new Map();
  const put = (line, jenis, sisa, status) => {
    if (sisa === null || sisa === undefined) return;
    const key = `${line}|${jenis}`;
    if (!map.has(key)) map.set(key, { key, line, jenis, sisa, status });
  };
  for (const l of attention) {
    put(l.line_name, 'Monthly', l.sisa_hari_monthly, l.status_monthly);
    put(l.line_name, 'Weekly', l.sisa_hari_weekly, l.status_weekly);
  }
  for (const u of upcoming) {
    if (u.type === 'PM_LINE_MONTHLY') put(u.line_name, 'Monthly', dayDiff(u.estimated_date), u.status);
    if (u.type === 'PM_LINE_WEEKLY') put(u.line_name, 'Weekly', dayDiff(u.estimated_date), u.status);
  }
  return [...map.values()].sort((a, b) => a.sisa - b.sisa || WORST[a.status] - WORST[b.status]);
}

function useFullscreen() {
  const [full, setFull] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.()?.catch?.(() => {});
  };
  return [full, toggle];
}

function Clock_() {
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <div className="text-sm text-muted-foreground">{now.format('dddd, D MMMM YYYY')}</div>
      <div className="font-[var(--font-display)] text-4xl font-semibold leading-none tabular-nums">{now.format('HH:mm:ss')}</div>
    </div>
  );
}

function Kpi({ icon, label, sub, value, cls }) {
  return (
    <div className={`flex min-w-0 items-center gap-3 rounded-2xl border border-current/30 px-4 py-3 ${cls}`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight">{label}</div>
        {sub && <div className="text-xs leading-tight opacity-80">{sub}</div>}
        <div className="font-[var(--font-display)] text-4xl font-semibold leading-tight tabular-nums text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Panel({ icon, title, aside, children, className = '' }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4 ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="m-0 flex items-center gap-2 whitespace-nowrap font-[var(--font-display)] text-lg font-semibold">
          <span className="text-[var(--accent)]">{icon}</span>
          {title}
        </h2>
        {aside && <span className="whitespace-nowrap text-sm text-muted-foreground">{aside}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]">{children}</div>
    </section>
  );
}

const Th = ({ children, right, center }) => (
  <th className={`sticky top-0 z-10 whitespace-nowrap border-b border-border bg-card px-2 py-1.5 text-xs font-normal text-[var(--text-faint)] ${right ? 'text-right' : center ? 'text-center' : 'text-left'}`}>{children}</th>
);

function Pill({ status, label }) {
  return <span className={`inline-block min-w-[4.5rem] rounded px-2 py-0.5 text-center text-xs font-semibold ${PILL[status]}`}>{label}</span>;
}

function AllGood({ title, text }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-ok/40 bg-ok-dim px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ok text-black"><CheckCircle2 size={40} /></div>
      <div className="font-[var(--font-display)] text-xl font-semibold text-ok">{title}</div>
      <div className="text-sm text-muted-foreground">{text}</div>
    </div>
  );
}

const tvIconBtn = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground no-underline transition-colors hover:bg-[var(--panel-2)] hover:text-foreground';

function TvDashboardPage() {
  const { hasPackage, hasPermission } = useAuth();
  const [isFull, toggleFull] = useFullscreen();
  useScaleToScreen();
  const [params, setParams] = useSearchParams();
  const rows = clampRows(Number(params.get('rows')) || readStoredRows());
  const changeRows = (n) => {
    try { localStorage.setItem(ROWS_KEY, String(n)); } catch { /* storage bisa diblok, abaikan */ }
    setParams((prev) => { const next = new URLSearchParams(prev); next.set('rows', String(n)); return next; }, { replace: true });
  };

  const canSeeInventory = hasPackage('B')
    && (hasPermission('inventory.view') || hasPermission('inventory.input') || hasPermission('inventory.manage'));

  const line = useTvLineSummary();
  const part = useTvPartSummary();
  const upcoming = useTvUpcoming().data ?? [];
  const syncQ = useTvSyncStatus();
  const summary = useTvSummary().data;
  const needOrder = useTvInventoryNeedOrder(canSeeInventory).data;

  const sync = syncQ.data;
  const ld = line.data;
  const pd = part.data;
  const failed = (line.isError && !ld) || (part.isError && !pd);
  const stale = line.isError || part.isError;
  const connected = sync?.status === 'success';

  // Sisa shot paling sedikit (semua status). Fallback ke top_attention kalau backend belum update.
  const topParts = (pd?.top_lowest_shot ?? pd?.top_attention ?? []).slice(0, rows);
  const nextActions = buildNextActions(ld?.attention ?? [], upcoming);
  const nextRows = nextActions.slice(0, rows);

  const lineUpcoming = new Set(upcoming.filter((u) => u.type !== 'PM_PART').map((u) => u.line_name)).size;
  const compliance = overallCompliance(summary);

  const priority = [
    ...nextActions.filter((r) => r.sisa <= 0).map((r) => ({
      key: `l-${r.key}`, title: r.line, sub: `PM ${r.jenis}`, info: sisaLabel(r.sisa), status: r.status,
    })),
    ...(pd?.top_attention ?? []).filter((p) => p.status === 'DANGER').map((p) => ({
      key: `p-${p.part_id}`, title: p.line_name, sub: [p.drawing_no, p.part_name].filter(Boolean).join(' • '), info: `Sisa ${num(p.remaining_shot)} shot`, status: 'DANGER',
    })),
  ];

  const dayCols = Array.from({ length: 8 }, (_, i) => {
    const d = dayjs().add(i, 'day');
    const iso = d.format('YYYY-MM-DD');
    const seen = new Map();
    for (const u of upcoming) {
      if (u.estimated_date !== iso) continue;
      const tag = u.type === 'PM_LINE_MONTHLY' ? 'M' : u.type === 'PM_LINE_WEEKLY' ? 'W' : 'P';
      const k = `${u.line_name}|${tag}`;
      const prev = seen.get(k);
      if (!prev || WORST[u.status] < WORST[prev.status]) seen.set(k, { key: k, line: u.line_name, tag, status: u.status });
    }
    const entries = [...seen.values()].sort((a, b) => a.line.localeCompare(b.line));
    return { key: iso, d, entries, lineCount: new Set(entries.map((e) => e.line)).size, sunday: d.day() === 0 };
  });

  const kpis = [
    { key: 'total', icon: <Package size={30} />, label: 'Total Part Monitoring', value: num(pd?.total_parts), cls: 'bg-[var(--accent-dim)] text-[var(--accent)]' },
    { key: 'danger', icon: <ShieldAlert size={30} />, label: 'Danger Part', value: num(pd?.status_danger), cls: 'bg-danger-dim text-danger' },
    { key: 'warn', icon: <AlertTriangle size={30} />, label: 'Warning Part', value: num(pd?.status_warning), cls: 'bg-warn-dim text-warn' },
    { key: 'ok', icon: <CheckCircle2 size={30} />, label: 'OK Part', value: num(pd?.status_ok), cls: 'bg-ok-dim text-ok' },
    { key: 'line', icon: <CalendarClock size={30} />, label: 'Line Perlu PM', sub: '(7 Hari)', value: num(lineUpcoming), cls: 'bg-[rgba(139,92,246,0.14)] text-[#8b5cf6]' },
    ...(canSeeInventory
      ? [{ key: 'inv', icon: <Boxes size={30} />, label: 'Inventory Need Order', value: num(needOrder ?? 0), cls: 'bg-[rgba(6,182,212,0.14)] text-[#06b6d4]' }]
      : []),
    { key: 'comp', icon: <Target size={30} />, label: 'PM Compliance', sub: '(Tahun Ini)', value: compliance === null ? '-' : `${compliance.toFixed(1)}%`, cls: 'bg-[var(--accent-dim)] text-[var(--accent)]' },
  ];

  const lastSync = sync?.last_synced_at ? dayjs(sync.last_synced_at) : null;
  const lastSyncText = lastSync ? lastSync.format(lastSync.isSame(dayjs(), 'day') ? 'HH:mm' : 'D MMM HH:mm') : '-';

  return (
    <div className="grid h-screen grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] gap-3 overflow-hidden bg-background p-4 text-foreground">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Wrench size={44} className="text-[var(--accent)]" strokeWidth={2.2} />
          <div>
            <h1 className="m-0 font-[var(--font-display)] text-4xl font-semibold leading-tight">PM Monitoring</h1>
            <div className="text-sm text-muted-foreground">Jaga kondisi mesin, lakukan PM sesuai jadwal</div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {stale && <div className="flex items-center gap-2 rounded-lg bg-warn-dim px-3 py-2 text-sm text-warn"><WifiOff size={16} /> Data mungkin tidak terbaru</div>}
          <div className="flex items-center gap-2">
            <select
              value={ROW_OPTIONS.includes(rows) ? rows : ''}
              onChange={(e) => changeRows(Number(e.target.value))}
              className="h-9 rounded-md border border-border bg-card px-2 text-sm text-muted-foreground hover:bg-[var(--panel-2)] hover:text-foreground"
              title="Jumlah baris tabel"
              aria-label="Jumlah baris tabel"
            >
              {!ROW_OPTIONS.includes(rows) && <option value="">{rows} baris</option>}
              {ROW_OPTIONS.map((n) => <option key={n} value={n}>{n} baris</option>)}
            </select>
            <Link to="/" className={tvIconBtn} title="Keluar TV" aria-label="Keluar dari Mode TV">
              <ArrowLeft size={18} />
            </Link>
            <button type="button" onClick={toggleFull} className={tvIconBtn} title={isFull ? 'Keluar layar penuh' : 'Layar penuh'} aria-label={isFull ? 'Keluar layar penuh' : 'Layar penuh'}>
              {isFull ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
          <Clock_ />
          <div className="h-12 w-px bg-border" />
          <div className="flex items-start gap-2">
            <span className={`mt-1 h-3.5 w-3.5 rounded-full ${syncQ.isLoading ? 'bg-[var(--text-faint)]' : connected ? 'bg-ok' : 'bg-danger'}`} />
            <div>
              <div className={`font-semibold leading-tight ${syncQ.isLoading ? 'text-muted-foreground' : connected ? 'text-ok' : 'text-danger'}`}>
                {syncQ.isLoading ? 'Menghubungkan...' : connected ? 'Produksi Terhubung' : 'Produksi Terputus'}
              </div>
              <div className="text-xs text-muted-foreground">Last Sync: {lastSyncText}</div>
              {sync?.rows_synced ? <div className="text-xs text-muted-foreground">({num(sync.rows_synced)} data produksi)</div> : null}
            </div>
          </div>
        </div>
      </header>

      {failed ? (
        <div className="row-span-3 flex items-center justify-center rounded-2xl border border-border bg-card text-xl text-muted-foreground">
          Gagal memuat data. Mencoba lagi otomatis... (jika terus muncul, login ulang)
        </div>
      ) : (
        <>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))` }}>
            {kpis.map(({ key, ...k }) => <Kpi key={key} {...k} />)}
          </div>

          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1.65fr)] gap-3">
            <Panel icon={<ClipboardList size={22} />} title="Prioritas Hari Ini" aside={dayjs().format('dddd, D MMMM YYYY')}>
              {priority.length === 0 ? (
                <AllGood title="Tidak ada PM hari ini" text="Semua mesin dalam kondisi aman. Tetap lakukan pengecekan rutin dan jaga kondisi mesin." />
              ) : (
                <div className="flex flex-col gap-1.5">
                  {priority.slice(0, 7).map((p) => (
                    <div key={p.key} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 ${p.status === 'DANGER' ? 'bg-danger-dim' : 'bg-warn-dim'}`}>
                      <div className="min-w-0">
                        <div className="font-[var(--font-mono)] font-semibold">{p.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.sub}</div>
                      </div>
                      <div className={`shrink-0 text-sm font-semibold ${TONE[p.status]}`}>{p.info}</div>
                    </div>
                  ))}
                  {priority.length > 7 && <div className="pt-1 text-center text-xs text-[var(--text-faint)]">+{priority.length - 7} lainnya</div>}
                </div>
              )}
            </Panel>

            <Panel icon={<Clock size={22} />} title="PM Terdekat (Next Action)">
              {nextRows.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">Belum ada jadwal PM Line</div>
              ) : (
                <table className="w-full whitespace-nowrap border-collapse text-sm">
                  <thead><tr><Th>No</Th><Th>Line</Th><Th>Jenis PM</Th><Th center>Sisa Hari</Th><Th center>Status</Th></tr></thead>
                  <tbody>
                    {nextRows.map((r, i) => (
                      <tr key={r.key} className="border-b border-[var(--border-soft)]">
                        <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-1 font-[var(--font-mono)]">{r.line}</td>
                        <td className="px-2 py-1">
                          <span className={`inline-block min-w-[4.5rem] rounded-full px-2.5 py-0.5 text-center text-xs font-semibold ${JENIS_CHIP[r.jenis]}`}>{r.jenis}</span>
                        </td>
                        <td className={`px-2 py-1 text-center font-semibold ${TONE[r.status]}`}>{sisaLabel(r.sisa)}</td>
                        <td className="px-2 py-1 text-center"><Pill status={r.status} label={STATUS_LABEL[r.status]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel icon={<Settings size={22} />} title={`Top ${rows} Part Perlu Perhatian`}>
              {topParts.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">Belum ada data part</div>
              ) : (
                <table className="w-full border-collapse text-sm [&_td]:whitespace-nowrap">
                  <thead><tr><Th>No</Th><Th>Line</Th><Th>IPDP</Th><Th>Part Name</Th><Th right>Sisa Shot</Th><Th center>Status</Th></tr></thead>
                  <tbody>
                    {topParts.map((p, i) => (
                      <tr key={p.part_id} className="border-b border-[var(--border-soft)]">
                        <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-1 font-[var(--font-mono)]">{p.line_name}</td>
                        <td className="px-2 py-1 font-[var(--font-mono)]">{p.drawing_no || '-'}</td>
                        <td className="px-2 py-1">{p.part_name || '-'}</td>
                        <td className={`px-2 py-1 text-right font-[var(--font-mono)] font-semibold ${TONE[p.status]}`}>{num(p.remaining_shot)}</td>
                        <td className="px-2 py-1 text-center"><Pill status={p.status} label={STATUS_LABEL[p.status]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_15rem] gap-3">
            <Panel icon={<CalendarDays size={22} />} title="Jadwal PM 7 Hari Ke Depan" aside="(Berdasarkan Tanggal Due)">
              <div className="grid grid-cols-8 gap-2">
                {dayCols.map((c) => (
                  <div key={c.key} className="flex h-[8.25rem] min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-[var(--panel-2)]">
                    <div className={`py-1 text-center ${c.sunday ? 'bg-danger-dim text-danger' : 'bg-[var(--accent-dim)] text-[var(--accent)]'}`}>
                      <div className="text-sm font-semibold leading-tight">{c.d.format('dddd')}</div>
                      <div className="text-xs leading-tight opacity-80">{c.d.format('D MMM YYYY')}</div>
                    </div>
                    {c.entries.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center text-xs text-[var(--text-faint)]">
                        <div className="text-base">-</div>Tidak ada jadwal
                      </div>
                    ) : (
                      <div className="flex min-h-0 flex-1 flex-col justify-between px-2 py-1.5">
                        <div className="flex flex-col gap-0.5 text-sm font-semibold">
                          {c.entries.slice(0, 3).map((e) => (
                            <div key={e.key} className="flex items-center justify-between gap-1">
                              <span className="truncate font-[var(--font-mono)]">{e.line}</span>
                              <span className={TAG_TONE[e.tag]}>({e.tag})</span>
                            </div>
                          ))}
                          {c.entries.length > 3 && <div className="text-xs font-normal text-[var(--text-faint)]">+{c.entries.length - 3} lagi</div>}
                        </div>
                        <div className="text-center text-xs font-semibold text-[var(--accent)]">{c.lineCount} line</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel icon={<Info size={22} />} title="Keterangan">
              <div className="flex flex-col gap-1 text-sm">
                <div><span className={`inline-block w-8 font-semibold ${TAG_TONE.M}`}>(M)</span> PM Monthly</div>
                <div><span className={`inline-block w-8 font-semibold ${TAG_TONE.W}`}>(W)</span> PM Weekly</div>
                <div><span className={`inline-block w-8 font-semibold ${TAG_TONE.P}`}>(P)</span> PM Part</div>
                <div className="mt-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-danger" /> Danger: segera dilakukan</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-warn" /> Warning: perlu perhatian</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-ok" /> OK: normal / aman</div>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}

      <footer className="flex items-center justify-between text-sm text-[var(--text-faint)]">
        <span>PM Monitoring System <span className="mx-2">|</span> Keep the Machine Running</span>
        <span className="italic">Preventive Maintenance for Stable Production</span>
      </footer>
    </div>
  );
}

export default TvDashboardPage;
