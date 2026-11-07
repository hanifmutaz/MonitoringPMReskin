// src/pages/DashboardPage.jsx
//
// Dashboard Management (redesign 7 Nov 2026). Isinya sengaja dibatasi untuk kebutuhan management:
//   KPI (snapshot): Total Parts, Active Lines, Part Butuh Perhatian, Line Kritis
//   Ketepatan PM (ikut PERIODE GLOBAL, bisa backdate): kartu bulan, kartu tahun, chart per bulan,
//     tren 6 bulan, dan daftar Line < 100% (bulan & tahun)
//   Snapshot: Ringkasan Status Line, Critical Alerts, Line Tidak Running
// Jadwal PM 7 hari ke depan & Line Terlambat sengaja tidak di sini (ada di Mode TV).
//
// Tampilan site lain (multi-site) hanya punya snapshot: pemilih periode, chart 12 bulan, dan detail telat
// tidak tersedia di sana (lihat viewFromRemote).
import { useState } from 'react';
import { Package, Factory, AlertTriangle, ShieldAlert, Target, Info } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useDashboardAttention, useDashboardIdleLines, useDashboardKetepatan, useDashboardMultiSite } from '../hooks/useDashboardExtras';
import KpiCard from '../components/KpiCard';
import LineStatusDonut from '../components/LineStatusDonut';
import CriticalAlertsPanel from '../components/CriticalAlertsPanel';
import IdleLinesPanel from '../components/IdleLinesPanel';
import SiteSwitcher from '../components/SiteSwitcher';
import KetepatanPeriodPicker from '../components/KetepatanPeriodPicker';
import KetepatanYearChart from '../components/KetepatanYearChart';
import KetepatanLateDetailModal from '../components/KetepatanLateDetailModal';
import { KetepatanTrendPanel, KetepatanBelowTargetPanel } from '../components/KetepatanPanels';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import { Button } from '../components/ui/button';
import { formatPct, pctTone, pctCaption, monthLabel, viewFromLocal, viewFromRemote } from '../utils/ketepatanDashboard';

const HEALTH_STAT_CLASS = {
  ok: { bg: 'bg-ok-dim', text: 'text-ok', border: 'border-ok/20' },
  warn: { bg: 'bg-warn-dim', text: 'text-warn', border: 'border-warn/20' },
  danger: { bg: 'bg-danger-dim', text: 'text-danger', border: 'border-danger/20' },
};

function HealthStat({ value, label, tone }) {
  const cfg = HEALTH_STAT_CLASS[tone];
  return (
    <div className={`flex min-h-[80px] flex-1 flex-col items-center justify-center rounded-xl border p-4 text-center ${cfg.bg} ${cfg.border}`}>
      <div className={`font-[var(--font-display)] text-[30px] font-semibold leading-none tracking-tight ${cfg.text}`}>{value}</div>
      <div className="mt-2 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="relative overflow-visible rounded-xl border border-border bg-card p-4.5 pt-7 shadow-sm">
      <Skeleton className="absolute -top-3.5 right-4 h-11 w-11 rounded-xl" />
      <Skeleton className="mb-2 h-2.5 w-20" />
      <Skeleton className="mb-1 h-7 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

// Kartu ketepatan 1 jenis PM. cell = { percentage, total }; beforeStart = periode di luar batas awal hitung.
function KetepatanKpi({ label, cell, caption, beforeStart }) {
  return (
    <KpiCard
      icon={<Target size={18} />}
      label={label}
      value={beforeStart ? '—' : formatPct(cell.percentage)}
      caption={pctCaption(cell, caption, { beforeStart })}
      status={beforeStart ? 'muted' : pctTone(cell.percentage)}
    />
  );
}

const CAPTION = {
  part: 'Diganti sebelum/tepat target shot',
  monthly: 'Input sebelum poin lewat cap',
  weekly: 'Input dalam siklus hari weekly',
};

// Judul periode. Periode berjalan memakai istilah "Bulan Ini"/"Tahun Berjalan"; backdate memakai nama bulan/tahun asli.
function periodTitles(view) {
  const current = view.source === 'remote' || view.isCurrent;
  if (current) {
    return {
      bulanCard: `Bulan Ini - ${monthLabel(view.month)}`,
      tahunCard: 'Tahun Berjalan',
      monthTab: 'Bulan Ini',
      yearTab: 'Tahun Berjalan',
      monthLabel: 'Bulan Ini',
      yearLabel: 'Tahun Berjalan',
    };
  }
  const yearText = `Tahun ${view.year}, Jan – ${monthLabel(view.month, 'name')}`;
  return {
    bulanCard: monthLabel(view.month),
    tahunCard: yearText,
    monthTab: monthLabel(view.month, 'short'),
    yearTab: `Jan – ${monthLabel(view.month, 'name')} ${view.year}`,
    monthLabel: monthLabel(view.month),
    yearLabel: yearText,
  };
}

function DashboardPage() {
  usePageHeader({ title: 'Dashboard Management' });
  const { hasPermission } = useAuth();
  const canSwitchSite = hasPermission('dashboard.multi_site');
  const { data: multiSite } = useDashboardMultiSite({ enabled: canSwitchSite });
  const sites = multiSite ?? [];
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const remoteSite = selectedSiteId ? sites.find((s) => s.site_id === selectedSiteId) : null;
  const isRemoteView = !!remoteSite;

  // null = bulan berjalan (auto-refresh); 'YYYY-MM' = backdate (data tetap).
  const [month, setMonth] = useState(null);
  const [belowPeriod, setBelowPeriod] = useState('month');
  const [lateItem, setLateItem] = useState(null);

  const localSummary = useDashboardSummary();
  const localAttention = useDashboardAttention();
  const localIdle = useDashboardIdleLines();
  const localKetepatan = useDashboardKetepatan(month ?? undefined);

  const summary = isRemoteView ? remoteSite.data?.summary : localSummary.data;
  const attention = isRemoteView ? remoteSite.data?.attention ?? [] : localAttention.data ?? [];
  const loadingSummary = isRemoteView ? false : localSummary.isLoading;
  const errorSummary = isRemoteView ? false : localSummary.isError;

  let view = null;
  if (isRemoteView) view = viewFromRemote(remoteSite.data?.summary, remoteSite.data?.ketepatan_attention ?? []);
  else if (localKetepatan.data) view = viewFromLocal(localKetepatan.data);

  if (errorSummary) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="danger"
        title="Gagal memuat data dashboard"
        description="Terjadi kesalahan saat memuat ringkasan dashboard."
        action={<Button type="button" size="sm" variant="outline" onClick={() => localSummary.refetch()}>Coba Lagi</Button>}
      />
    );
  }

  if (isRemoteView && !remoteSite.data) {
    return (
      <div className="flex flex-col gap-5">
        <SiteSwitcher sites={sites} selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />
        <EmptyState title="Belum ada data" description={`Belum pernah berhasil narik data dari ${remoteSite.site_label}.${remoteSite.error ? ` (${remoteSite.error})` : ''}`} />
      </div>
    );
  }

  const titles = view ? periodTitles(view) : null;
  const isLocalBackdate = !isRemoteView && view && !view.isCurrent;
  const ketepatanLoading = !isRemoteView && localKetepatan.isLoading;
  const ketepatanError = !isRemoteView && localKetepatan.isError && !localKetepatan.data;
  // Saat pindah bulan, angka lama tetap tampil (redup) sampai data baru datang.
  const dim = !isRemoteView && localKetepatan.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity';

  const handlePeriodChange = (next) => {
    setMonth(next === view?.currentMonth ? null : next);
  };

  const belowItems = view ? (isRemoteView || belowPeriod === 'year' ? view.belowTarget.tahun : view.belowTarget.bulan) : [];
  const belowPeriodShown = isRemoteView ? 'year' : belowPeriod;

  return (
    <div className="flex flex-col gap-5">
      <SiteSwitcher sites={sites} selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />

      {/* KPI snapshot (kondisi saat ini) */}
      {loadingSummary ? (
        <div className="grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <KpiCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={<Package size={18} />} label="Total Parts" value={summary.total_parts.toLocaleString('id-ID')} caption={`${summary.status_ok} OK`} status="accent" />
          <KpiCard icon={<Factory size={18} />} label="Active Lines" value={summary.active_lines} caption={`${summary.lines_healthy} sehat`} status="accent" />
          <KpiCard icon={<AlertTriangle size={18} />} label="Part Butuh Perhatian" value={summary.status_warning + summary.status_danger} caption={`${summary.status_danger} danger, ${summary.status_warning} warning`} status="warn" />
          <KpiCard icon={<ShieldAlert size={18} />} label="Line Kritis" value={summary.lines_critical} caption={`${summary.lines_warning} perlu perhatian`} status="danger" />
        </div>
      )}

      {/* Pemilih periode global: menggerakkan semua blok Ketepatan PM di bawah */}
      {!isRemoteView && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-[var(--font-display)] text-base font-semibold">Ketepatan PM</h2>
          <KetepatanPeriodPicker
            month={view?.month}
            currentMonth={view?.currentMonth}
            onChange={handlePeriodChange}
            busy={localKetepatan.isFetching && localKetepatan.isPlaceholderData}
          />
        </div>
      )}

      {isLocalBackdate && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-[var(--panel-2)] px-3.5 py-2.5 text-xs text-muted-foreground" role="note">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Menampilkan Ketepatan PM per kondisi <strong className="font-semibold text-foreground">{monthLabel(view.month)}</strong>.
            KPI di atas, Ringkasan Status Line, Critical Alerts, dan Line Tidak Running selalu menampilkan kondisi saat ini.
          </span>
        </div>
      )}

      {ketepatanError && (
        <EmptyState
          icon={AlertTriangle}
          tone="danger"
          title="Gagal memuat Ketepatan PM"
          description="Terjadi kesalahan saat memuat data ketepatan untuk periode ini."
          action={<Button type="button" size="sm" variant="outline" onClick={() => localKetepatan.refetch()}>Coba Lagi</Button>}
        />
      )}

      {ketepatanLoading && !view && (
        <div className="grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-2">
          {[1, 2].map((i) => <KpiCardSkeleton key={i} />)}
        </div>
      )}

      {view?.bulan && (
        <Card className={dim}>
          <CardHeader><CardTitle>Ketepatan PM ({titles.bulanCard})</CardTitle></CardHeader>
          <div className="grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-2">
            <KetepatanKpi label="Ketepatan PM Monthly" cell={view.bulan.monthly} caption={CAPTION.monthly} beforeStart={view.bulan.beforeStart} />
            <KetepatanKpi label="Ketepatan PM Weekly" cell={view.bulan.weekly} caption={CAPTION.weekly} beforeStart={view.bulan.beforeStart} />
          </div>
        </Card>
      )}

      {view && (
        <Card className={dim}>
          <CardHeader><CardTitle>Ketepatan PM ({titles.tahunCard})</CardTitle></CardHeader>
          <div className="grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-3">
            <KetepatanKpi label="Ketepatan PM Part" cell={view.tahun.part} caption={CAPTION.part} beforeStart={view.tahun.beforeStart} />
            <KetepatanKpi label="Ketepatan PM Monthly" cell={view.tahun.monthly} caption={CAPTION.monthly} beforeStart={view.tahun.beforeStart} />
            <KetepatanKpi label="Ketepatan PM Weekly" cell={view.tahun.weekly} caption={CAPTION.weekly} beforeStart={view.tahun.beforeStart} />
          </div>
        </Card>
      )}

      {/* Chart per bulan + tren 6 bulan: berdampingan di layar lebar */}
      {view && (
        <div className={`grid grid-cols-1 gap-5 ${view.byMonth ? 'xl:grid-cols-2' : ''} ${dim}`}>
          {view.byMonth && (
            <Card className="h-full">
              <CardHeader><CardTitle>Ketepatan PM per Bulan ({view.year})</CardTitle></CardHeader>
              <KetepatanYearChart byMonth={view.byMonth} selectedMonth={view.month} />
            </Card>
          )}
          <KetepatanTrendPanel data={view.trend} currentMonth={view.currentMonth} selectedMonth={view.month} />
        </div>
      )}

      {/* Ringkasan Status Line + Critical Alerts (snapshot) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="h-full">
          <CardHeader><CardTitle>Ringkasan Status Line</CardTitle></CardHeader>
          {!loadingSummary && summary && (
            <div className="flex flex-col gap-5">
              <LineStatusDonut healthy={summary.lines_healthy} warning={summary.lines_warning} critical={summary.lines_critical} />
              <div className="grid grid-cols-3 gap-3">
                <HealthStat value={summary.lines_healthy} label="Healthy" tone="ok" />
                <HealthStat value={summary.lines_warning} label="Warning" tone="warn" />
                <HealthStat value={summary.lines_critical} label="Critical" tone="danger" />
              </div>
            </div>
          )}
        </Card>
        {!(isRemoteView ? false : localAttention.isLoading) && <CriticalAlertsPanel items={attention} />}
      </div>

      {/* Line < 100% + Line Tidak Running (Idle hanya data lokal) */}
      <div className={`grid grid-cols-1 gap-5 ${isRemoteView ? '' : 'xl:grid-cols-2'}`}>
        {view && (
          <div className={`h-full ${dim}`}>
            <KetepatanBelowTargetPanel
              items={belowItems}
              period={belowPeriodShown}
              onPeriodChange={isRemoteView ? undefined : setBelowPeriod}
              onSelect={isRemoteView ? undefined : setLateItem}
              labels={{ month: titles.monthLabel, year: titles.yearLabel, monthTab: titles.monthTab, yearTab: titles.yearTab }}
              isLoading={false}
            />
          </div>
        )}
        {!isRemoteView && <IdleLinesPanel data={localIdle.data} isLoading={localIdle.isLoading} />}
      </div>

      {lateItem && view && (
        <KetepatanLateDetailModal item={lateItem} period={belowPeriod} month={view.month} onClose={() => setLateItem(null)} />
      )}
    </div>
  );
}

export default DashboardPage;
