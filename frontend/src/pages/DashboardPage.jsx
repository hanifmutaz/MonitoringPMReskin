import { useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Package, Factory, AlertTriangle, ShieldAlert, Target, TrendingDown } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import {
  useDashboardAttention,
  useDashboardUpcoming,
  useDashboardKetepatanAttention,
  useDashboardMultiSite,
} from '../hooks/useDashboardExtras';
import KpiCard from '../components/KpiCard';
import LineStatusDonut from '../components/LineStatusDonut';
import CriticalAlertsPanel from '../components/CriticalAlertsPanel';
import GanttUpcomingPanel from '../components/GanttUpcomingPanel';
import SiteSwitcher from '../components/SiteSwitcher';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import { Button } from '../components/ui/button';

function formatKetepatan(percentage) {
  return percentage === null || percentage === undefined ? '100%' : `${percentage}%`;
}

function ketepatanStatus(percentage) {
  if (percentage === null || percentage === undefined) return 'accent';
  if (percentage >= 90) return 'accent';
  if (percentage >= 50) return 'warn';
  return 'danger';
}

function ketepatanCaption(percentage, total, defaultCaption, periodLabel = 'tahun ini') {
  if (percentage === null || percentage === undefined) return `Belum ada event ${periodLabel} - default 100%`;
  return `${defaultCaption}, dari ${total} event`;
}

// 'YYYY-MM' -> 'Okt 2026' / 'Oktober 2026'. Key bulan dari backend (WIB), jadi
// diparse sebagai tanggal 1 bulan itu supaya gak geser bulan karena timezone.
function formatMonthKey(monthKey, format = 'MMMM YYYY') {
  const d = dayjs(`${monthKey}-01`);
  return d.isValid() ? d.locale('id').format(format) : monthKey;
}

const PERCENT_BADGE_CLASS = {
  accent: { bg: 'bg-ok-dim', text: 'text-ok', dot: 'bg-ok' },
  warn: { bg: 'bg-warn-dim', text: 'text-warn', dot: 'bg-warn' },
  danger: { bg: 'bg-danger-dim', text: 'text-danger', dot: 'bg-danger' },
  muted: { bg: 'bg-[var(--panel-3)]', text: 'text-[var(--text-faint)]', dot: 'bg-[var(--text-faint)]' },
};

function PercentBadge({ percentage }) {
  const cfg = PERCENT_BADGE_CLASS[ketepatanStatus(percentage)];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-[10px] py-[3px] font-[var(--font-mono)] text-xs ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {formatKetepatan(percentage)}
    </span>
  );
}

const HEALTH_STAT_CLASS = {
  ok: { bg: 'bg-ok-dim', text: 'text-ok', border: 'border-ok/20' },
  warn: { bg: 'bg-warn-dim', text: 'text-warn', border: 'border-warn/20' },
  danger: { bg: 'bg-danger-dim', text: 'text-danger', border: 'border-danger/20' },
};

function HealthStat({ value, label, tone }) {
  const cfg = HEALTH_STAT_CLASS[tone];
  return (
    <div className={`flex min-h-[92px] flex-1 flex-col items-center justify-center rounded-xl border p-4 text-center ${cfg.bg} ${cfg.border}`}>
      {/* polish: A7 typography scale — samain ke display-tier standar (30px, sama kayak KpiCard), sebelumnya text-[28px] beda 2px tanpa alasan jelas */}
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

// Tren ketepatan per bulan PM Monthly & Weekly (6 bulan terakhir, lama -> baru). Bulan tanpa event
// tampil "-" (abu-abu), bukan 0%, supaya gak dikira performa jelek.
// Kolom bulan terakhir = bulan berjalan (belum final sampai akhir bulan).
function KetepatanTrendPanel({ data }) {
  if (!data || data.length === 0) return null;
  const lastIndex = data.length - 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tren Ketepatan PM per Bulan ({data.length} Bulan Terakhir)</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto" tabIndex="0" role="region" aria-label="Tabel tren ketepatan PM per bulan (scroll horizontal)">
        <table className="w-full border-collapse">
          <thead><tr>
            {['Bulan', 'Monthly', 'Weekly'].map((h) => (
              <th key={h} scope="col" className="border-b border-border px-2.5 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.month} className="hover:bg-[var(--panel-2)]">
                <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px]">
                  {formatMonthKey(row.month, 'MMM YYYY')}
                  {i === lastIndex && <span className="ml-1.5 text-[11px] text-[var(--text-faint)]">(berjalan)</span>}
                </td>
                {['monthly', 'weekly'].map((k) => (
                  <td key={k} className="border-b border-[var(--border-soft)] px-2.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <PercentBadge percentage={row[k].percentage} />
                      {row[k].total > 0 && <span className="text-[11px] text-[var(--text-faint)]">{row[k].total} event</span>}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}


// data-lewat-props supaya bisa dipakai buat data lokal MAUPUN site lain.
// Empty state: EmptyState default-nya udah punya border-dashed + py-12.
// Karena ditaro DI DALAM <Card> (yang udah ber-border + p-4.5), tanpa
// override bakal jadi "kotak-dalam-kotak" + ketinggian (ngambang di tengah).
// `border-0 py-8` + icon bikin dia nyatu jadi isi panel, bukan box terpisah.
function KetepatanAttentionPanel({ data = [], isLoading }) {
  if (isLoading) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <TrendingDown size={16} />
          Line Perlu Perhatian (Ketepatan PM Terendah, Tahun Berjalan)
        </CardTitle>
      </CardHeader>
      {data.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          className="border-0 py-8"
          title="Belum ada data ranking"
          description="Ranking ketepatan PM akan muncul di sini setelah ada event PM tahun ini."
        />
      ) : (
        <div className="overflow-x-auto" tabIndex="0" role="region" aria-label="Tabel ranking ketepatan PM (scroll horizontal)">
          <table className="w-full border-collapse">
            <thead><tr>
              {['Line', 'Ketepatan PM Part', 'Ketepatan Monthly', 'Ketepatan Weekly'].map((h) => (
                <th key={h} scope="col" className="border-b border-border px-2.5 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.line_id} className="hover:bg-[var(--panel-2)]">
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px]">{row.line_name}</td>
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5"><PercentBadge percentage={row.part_percentage} /></td>
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5"><PercentBadge percentage={row.monthly_percentage} /></td>
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5"><PercentBadge percentage={row.weekly_percentage} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
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

  const localSummary = useDashboardSummary();
  const localAttention = useDashboardAttention();
  const localUpcoming = useDashboardUpcoming();
  const localKetepatan = useDashboardKetepatanAttention();

  const summary = isRemoteView ? remoteSite.data?.summary : localSummary.data;
  const attention = isRemoteView ? remoteSite.data?.attention ?? [] : localAttention.data ?? [];
  const upcoming = isRemoteView ? remoteSite.data?.upcoming ?? [] : localUpcoming.data ?? [];
  const ketepatanAttention = isRemoteView ? remoteSite.data?.ketepatan_attention ?? [] : localKetepatan.data ?? [];
  const loadingSummary = isRemoteView ? false : localSummary.isLoading;
  const errorSummary = isRemoteView ? false : localSummary.isError;

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

  return (
    <div className="flex flex-col gap-5">
      <SiteSwitcher sites={sites} selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />

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

      {summary?.ketepatan_bulan_ini && (
        <Card>
          <CardHeader>
            <CardTitle>Ketepatan PM (Bulan Ini - {formatMonthKey(summary.ketepatan_bulan_ini.month)})</CardTitle>
          </CardHeader>
          {!loadingSummary && (
            <div className="grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-2">
              <KpiCard icon={<Target size={18} />} label="Ketepatan PM Monthly" value={formatKetepatan(summary.ketepatan_bulan_ini.monthly.percentage)} caption={ketepatanCaption(summary.ketepatan_bulan_ini.monthly.percentage, summary.ketepatan_bulan_ini.monthly.total, 'Input sebelum poin lewat cap', 'bulan ini')} status={ketepatanStatus(summary.ketepatan_bulan_ini.monthly.percentage)} />
              <KpiCard icon={<Target size={18} />} label="Ketepatan PM Weekly" value={formatKetepatan(summary.ketepatan_bulan_ini.weekly.percentage)} caption={ketepatanCaption(summary.ketepatan_bulan_ini.weekly.percentage, summary.ketepatan_bulan_ini.weekly.total, 'Input dalam siklus hari weekly', 'bulan ini')} status={ketepatanStatus(summary.ketepatan_bulan_ini.weekly.percentage)} />
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Ketepatan PM (Tahun Berjalan)</CardTitle></CardHeader>
        {!loadingSummary && (
          <div className="grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-3">
            <KpiCard icon={<Target size={18} />} label="Ketepatan PM Part" value={formatKetepatan(summary.ketepatan_pm_part_percentage)} caption={ketepatanCaption(summary.ketepatan_pm_part_percentage, summary.ketepatan_pm_part_total, 'Diganti sebelum/tepat target shot')} status={ketepatanStatus(summary.ketepatan_pm_part_percentage)} />
            <KpiCard icon={<Target size={18} />} label="Ketepatan PM Monthly" value={formatKetepatan(summary.ketepatan_pm_monthly_percentage)} caption={ketepatanCaption(summary.ketepatan_pm_monthly_percentage, summary.ketepatan_pm_monthly_total, 'Input sebelum poin lewat cap')} status={ketepatanStatus(summary.ketepatan_pm_monthly_percentage)} />
            <KpiCard icon={<Target size={18} />} label="Ketepatan PM Weekly" value={formatKetepatan(summary.ketepatan_pm_weekly_percentage)} caption={ketepatanCaption(summary.ketepatan_pm_weekly_percentage, summary.ketepatan_pm_weekly_total, 'Input dalam siklus hari weekly')} status={ketepatanStatus(summary.ketepatan_pm_weekly_percentage)} />
          </div>
        )}
      </Card>

      {!loadingSummary && <KetepatanTrendPanel data={summary?.ketepatan_trend} />}

      <KetepatanAttentionPanel data={ketepatanAttention} isLoading={isRemoteView ? false : localKetepatan.isLoading} />

      <Card>
        <CardHeader><CardTitle>Ringkasan Status Line</CardTitle></CardHeader>
        {!loadingSummary && (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <LineStatusDonut healthy={summary.lines_healthy} warning={summary.lines_warning} critical={summary.lines_critical} />
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <HealthStat value={summary.lines_healthy} label="Healthy" tone="ok" />
              <HealthStat value={summary.lines_warning} label="Warning" tone="warn" />
              <HealthStat value={summary.lines_critical} label="Critical" tone="danger" />
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {!(isRemoteView ? false : localAttention.isLoading) && <CriticalAlertsPanel items={attention} />}
        {!(isRemoteView ? false : localUpcoming.isLoading) && <GanttUpcomingPanel items={upcoming} />}
      </div>
    </div>
  );
}

export default DashboardPage;
