// src/pages/DashboardPage.jsx
import { useState } from 'react';
import { Package, Factory, AlertTriangle, ShieldAlert, Target, TrendingDown, Activity, Timer } from 'lucide-react';
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

// Reskin layout (checklist §3 item 3): `.panel`/`.kpi-grid` lama dilepas
// TOTAL (bukan digabung - lihat aturan §7.3 RESKIN-PLAN.md), diganti
// Tailwind murni. Style panel/tabel di sini NGIKUTIN pola yang udah dipakai
// di CriticalAlertsPanel.jsx/GanttUpcomingPanel.jsx (rounded-lg border-border
// bg-card p-4.5, judul text-[15px] font-semibold) - bukan pola baru, biar
// satu halaman konsisten.
//
// Konten & urutan section diadaptasi dari referensi
// `doc/reskin/mockup-management-dashboard.html` (keputusan Mutaz - checklist
// §5: "ambil isinya aja, bukan pagar pembatas"), TAPI cuma bagian yang
// datanya BENERAN ada di endpoint kita:
// - KPI grid utama: TETAP 4 kartu asli (Total Parts/Active Lines/Part Butuh
//   Perhatian/Line Kritis) - gak nambah kartu "PM Compliance"/"PM Overdue"
//   segala dari mockup karena itu cuma nama lain buat angka yang SAMA
//   (duplikat, bukan metric baru).
// - 2 kartu "Needs Data" (MTBF/MTTR): diambil APA ADANYA dari mockup -
//   di sana eksplisit ditandai "butuh sumber data breakdown/downtime" yang
//   emang belum ada di app kita. Jujur soal keterbatasan data (`NeedsDataCard`
//   di bawah), BUKAN diisi angka karangan.
// - "Overall Health": dipetakan ke `LineStatusDonut` yang SUDAH ada,
//   ditambah 3 kotak angka besar warna (pola `.health-item` di mockup,
//   referensi visual: KPI berwarna di image4/widget-statistics) di sebelah
//   donut - datanya SAMA kayak legend donut, cuma presentasinya lebih dense.
// - "Lowest PM Compliance" table dari mockup: dipetakan ke
//   `KetepatanAttentionPanel` yang SUDAH ada (data `ketepatan_attention`),
//   badge-nya sekarang ngikutin pola visual StatusBadge.jsx (bukan
//   `badge-*` class lama).
// - "Subcont Performance Comparison"/"Action Required"/"Top Critical
//   Issues"/filter period (Today/7D/30D/YTD) dari mockup DI-SKIP - gak ada
//   endpoint yang nyediain data pembanding granular kayak gitu (yang ada
//   cuma ringkasan per-site lewat `SiteSwitcher`, SUDAH dipakai di bawah).
//   Ngarang angka pembanding melanggar prinsip "data & logic gak berubah"
//   di RESKIN-PLAN.md §1.
// Data/logic (hook, query, permission gating) TETAP SAMA - cuma markup yang
// berubah.
//
// Phase 6 migration (docs/frontend/MIGRATION-PLAN.md): the repeated
// "rounded-lg border border-border bg-card p-4.5" + "mb-4 flex ... h2"
// panel wrapper (used identically by the Ketepatan PM section, the
// Ringkasan Status Line section, and KetepatanAttentionPanel) is now
// Card/CardHeader/CardTitle from ui/card - same markup, just no longer
// copy-pasted three times. KpiCard/LineStatusDonut/CriticalAlertsPanel/
// GanttUpcomingPanel/SiteSwitcher are untouched (not flagged as needing
// change, still working, still domain-appropriate).
//
// The full-page error state (errorSummary) previously showed static text
// "Coba Lagi" with no actual button - useDashboardSummary() already
// returns `refetch` via TanStack Query, it just wasn't wired to anything.
// Now wired to a real retry action, per 01-PRODUCT-UX-BRIEF.md §8's
// requirement that Error states have a working primary action - this only
// adds behavior, doesn't change the existing error-detection logic
// (errorSummary is computed exactly as before).
//
// KPI loading placeholder previously was 4 empty boxes with a literal "..."
// - replaced with a skeleton shaped like the real KpiCard (icon box + label
// line + value line + caption line) using the ui/Skeleton primitive, same
// approach already established by data-display/DataTable's loading state.

function formatKetepatan(percentage) {
  return percentage === null || percentage === undefined ? '-' : `${percentage}%`;
}

// 'muted' (bukan 'accent') buat "belum ada data" - null itu netral, bukan
// "bagus". Lihat KpiCard.jsx buat kenapa ini token terpisah dari accent/warn/danger.
function ketepatanStatus(percentage) {
  if (percentage === null || percentage === undefined) return 'muted';
  if (percentage >= 90) return 'accent';
  if (percentage >= 50) return 'warn';
  return 'danger';
}

function ketepatanCaption(percentage, total, defaultCaption) {
  if (percentage === null || percentage === undefined) return 'Belum ada event tahun ini';
  return `${defaultCaption} — dari ${total} event`;
}

// Badge kecil buat tabel "Ketepatan Terendah" - beda dari StatusBadge.jsx
// (yang inputnya status literal OK/WARNING/DANGER), di sini inputnya %
// mentah yang perlu dikonversi ke varian dulu (lewat `ketepatanStatus`).
// Visualnya sengaja disamain persis sama StatusBadge (bg-*-dim + text-* +
// dot) biar konsisten satu app, bukan gaya baru.
const PERCENT_BADGE_CLASS = {
  accent: { bg: 'bg-ok-dim', text: 'text-ok', dot: 'bg-ok' },
  warn: { bg: 'bg-warn-dim', text: 'text-warn', dot: 'bg-warn' },
  danger: { bg: 'bg-danger-dim', text: 'text-danger', dot: 'bg-danger' },
  muted: { bg: 'bg-[var(--panel-3)]', text: 'text-[var(--text-faint)]', dot: 'bg-[var(--text-faint)]' },
};

function PercentBadge({ percentage }) {
  const cfg = PERCENT_BADGE_CLASS[ketepatanStatus(percentage)];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-[10px] py-[3px] font-[var(--font-mono)] text-xs ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {formatKetepatan(percentage)}
    </span>
  );
}

// Kartu placeholder buat metric yang mockup tandain "Needs Data" (MTBF/MTTR)
// - border dashed + label jujur ("Belum tersedia"), BUKAN kartu KPI biasa
// (gak ada angka nyata buat ditampilin, jangan dipaksa keliatan "penuh").
function NeedsDataCard({ icon, label, note }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4.5">
      <div className="flex items-start justify-between">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-sm bg-[var(--panel-3)] text-[var(--text-faint)]">
          {icon}
        </div>
        <span className="rounded-[5px] bg-[var(--panel-3)] px-[7px] py-px text-[9px] font-bold uppercase tracking-[0.3px] text-[var(--text-faint)]">
          Needs Data
        </span>
      </div>
      <div>
        <div className="mb-1 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
          {label}
        </div>
        <div className="font-[var(--font-display)] text-[15px] font-semibold italic text-[var(--text-faint)]">
          Belum tersedia
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{note}</div>
      </div>
    </div>
  );
}

// Kotak angka besar warna, pendamping `LineStatusDonut` (pola `.health-item`
// di mockup, referensi visual image4/widget-statistics) - datanya SAMA
// kayak legend di dalam donut, cuma presentasi lebih dense/scannable.
const HEALTH_STAT_CLASS = {
  ok: { bg: 'bg-ok-dim', text: 'text-ok' },
  warn: { bg: 'bg-warn-dim', text: 'text-warn' },
  danger: { bg: 'bg-danger-dim', text: 'text-danger' },
};

function HealthStat({ value, label, tone }) {
  const cfg = HEALTH_STAT_CLASS[tone];
  return (
    <div className={`flex-1 rounded-[10px] p-3.5 text-center ${cfg.bg}`}>
      <div className={`font-[var(--font-display)] text-[22px] font-semibold ${cfg.text}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

// Shaped like the real KpiCard (icon box 34x34, label line, value line,
// caption line) rather than a generic empty box, so the loading state
// doesn't visually jump when real data arrives. Local to this file since
// KpiCard's exact shape is Dashboard-specific for now - promote to
// data-display/ only if a second consumer needs it (COMPONENT-INVENTORY.md
// rule: new abstractions need multiple justified consumers).
function KpiCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4.5">
      <Skeleton className="mb-3 h-[34px] w-[34px] rounded-sm" />
      <Skeleton className="mb-2 h-2.5 w-20" />
      <Skeleton className="mb-1 h-7 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

// Diubah jadi terima data lewat props (bukan manggil hook sendiri) supaya
// bisa dipakai buat data lokal MAUPUN data site lain hasil switcher - satu
// komponen, dua sumber data.
function KetepatanAttentionPanel({ data = [], isLoading }) {
  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <TrendingDown size={16} />
          Line Perlu Perhatian — Ketepatan PM Terendah (Tahun Berjalan)
        </CardTitle>
      </CardHeader>
      {data.length === 0 ? (
        <EmptyState title="Belum ada data" description="Belum ada data ketepatan PM tahun ini buat dirangking." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Line', 'Ketepatan PM Part', 'Ketepatan Monthly', 'Ketepatan Weekly'].map((h) => (
                  <th
                    key={h}
                    className="border-b border-border px-2.5 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.line_id} className="hover:bg-[var(--panel-2)]">
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px]">
                    {row.line_name}
                  </td>
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5">
                    <PercentBadge percentage={row.part_percentage} />
                  </td>
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5">
                    <PercentBadge percentage={row.monthly_percentage} />
                  </td>
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5">
                    <PercentBadge percentage={row.weekly_percentage} />
                  </td>
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

  // Site switcher: cuma nembak /dashboard/multi-site kalau user punya
  // permission-nya (kalau gak, query di-skip total - lihat useDashboardMultiSite).
  // `sites` kosong di instance Subcont atau kalau REMOTE_SITE_* belum
  // dikonfigurasi - SiteSwitcher otomatis gak render apa-apa dalam kondisi itu.
  const { data: multiSite } = useDashboardMultiSite({ enabled: canSwitchSite });
  const sites = multiSite ?? [];
  const [selectedSiteId, setSelectedSiteId] = useState(null);

  // selectedSiteId null = belum pernah klik tab = tetap pakai data lokal
  // (endpoint asli, cepat, gak nunggu multi-site query). Baru begitu user
  // klik salah satu tab (termasuk tab "Internal" sendiri), sumber data
  // pindah ke hasil /dashboard/multi-site.
  const remoteSite = selectedSiteId ? sites.find((s) => s.site_id === selectedSiteId) : null;
  const isRemoteView = !!remoteSite;

  const localSummary = useDashboardSummary();
  const localAttention = useDashboardAttention();
  const localUpcoming = useDashboardUpcoming();
  const localKetepatan = useDashboardKetepatanAttention();

  const summary = isRemoteView ? remoteSite.data?.summary : localSummary.data;
  const attention = isRemoteView ? remoteSite.data?.attention ?? [] : localAttention.data ?? [];
  const upcoming = isRemoteView ? remoteSite.data?.upcoming ?? [] : localUpcoming.data ?? [];
  const ketepatanAttention = isRemoteView
    ? remoteSite.data?.ketepatan_attention ?? []
    : localKetepatan.data ?? [];

  const loadingSummary = isRemoteView ? false : localSummary.isLoading;
  const errorSummary = isRemoteView ? false : localSummary.isError;

  if (errorSummary) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="danger"
        title="Gagal memuat data dashboard"
        description="Terjadi kesalahan saat memuat ringkasan dashboard."
        action={
          <Button type="button" size="sm" variant="outline" onClick={() => localSummary.refetch()}>
            Coba Lagi
          </Button>
        }
      />
    );
  }

  // Site remote dipilih tapi belum pernah berhasil ditarik sama sekali
  // (status 'unreachable' + data null) - gak ada apa-apa buat ditampilin.
  if (isRemoteView && !remoteSite.data) {
    return (
      <div className="flex flex-col gap-5">
        <SiteSwitcher sites={sites} selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />
        <EmptyState
          title="Belum ada data"
          description={`Belum pernah berhasil narik data dari ${remoteSite.site_label}.${remoteSite.error ? ` (${remoteSite.error})` : ''}`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <SiteSwitcher sites={sites} selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />

      {loadingSummary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Package size={18} />}
            label="Total Parts"
            value={summary.total_parts.toLocaleString('id-ID')}
            caption={`${summary.status_ok} OK`}
            status="accent"
          />
          <KpiCard
            icon={<Factory size={18} />}
            label="Active Lines"
            value={summary.active_lines}
            caption={`${summary.lines_healthy} sehat`}
            status="accent"
          />
          <KpiCard
            icon={<AlertTriangle size={18} />}
            label="Part Butuh Perhatian"
            value={summary.status_warning + summary.status_danger}
            caption={`${summary.status_danger} danger, ${summary.status_warning} warning`}
            status="warn"
          />
          <KpiCard
            icon={<ShieldAlert size={18} />}
            label="Line Kritis"
            value={summary.lines_critical}
            caption={`${summary.lines_warning} perlu perhatian`}
            status="danger"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NeedsDataCard icon={<Activity size={18} />} label="MTBF" note="Butuh sumber data breakdown/downtime mesin" />
        <NeedsDataCard icon={<Timer size={18} />} label="MTTR" note="Butuh sumber data breakdown/downtime mesin" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ketepatan PM (Tahun Berjalan)</CardTitle>
        </CardHeader>
        {!loadingSummary && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              icon={<Target size={18} />}
              label="Ketepatan PM Part"
              value={formatKetepatan(summary.ketepatan_pm_part_percentage)}
              caption={ketepatanCaption(
                summary.ketepatan_pm_part_percentage,
                summary.ketepatan_pm_part_total,
                'Diganti sebelum/tepat target shot'
              )}
              status={ketepatanStatus(summary.ketepatan_pm_part_percentage)}
            />
            <KpiCard
              icon={<Target size={18} />}
              label="Ketepatan PM Monthly"
              value={formatKetepatan(summary.ketepatan_pm_monthly_percentage)}
              caption={ketepatanCaption(
                summary.ketepatan_pm_monthly_percentage,
                summary.ketepatan_pm_monthly_total,
                'Input sebelum poin mentok cap'
              )}
              status={ketepatanStatus(summary.ketepatan_pm_monthly_percentage)}
            />
            <KpiCard
              icon={<Target size={18} />}
              label="Ketepatan PM Weekly"
              value={formatKetepatan(summary.ketepatan_pm_weekly_percentage)}
              caption={ketepatanCaption(
                summary.ketepatan_pm_weekly_percentage,
                summary.ketepatan_pm_weekly_total,
                'Input dalam siklus hari weekly'
              )}
              status={ketepatanStatus(summary.ketepatan_pm_weekly_percentage)}
            />
          </div>
        )}
      </Card>

      <KetepatanAttentionPanel
        data={ketepatanAttention}
        isLoading={isRemoteView ? false : localKetepatan.isLoading}
      />

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Status Line</CardTitle>
        </CardHeader>
        {!loadingSummary && (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <LineStatusDonut
              healthy={summary.lines_healthy}
              warning={summary.lines_warning}
              critical={summary.lines_critical}
            />
            <div className="flex flex-1 gap-3">
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
