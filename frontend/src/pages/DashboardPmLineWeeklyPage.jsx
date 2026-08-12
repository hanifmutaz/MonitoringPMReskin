// src/pages/DashboardPmLineWeeklyPage.jsx
// Reskin (checklist §3 item 3, batch terakhir - nyusul DashboardPage.jsx
// yang udah duluan): `.panel`/`.panel-header`/`.panel-title`/`.data-table`/
// `.kpi-grid`/`.empty-state`/`.error-state` lama dilepas TOTAL, diganti
// Tailwind murni. Layout persis NGIKUTIN pola yang udah dipakai di
// DashboardPage.jsx (rounded-lg border-border bg-card p-4.5, judul
// text-[15px] font-semibold) - bukan pola baru. Data/logic (hook,
// multi-site switching, permission gating) TIDAK berubah sama sekali.
import { useState } from 'react';
import { Factory, AlertTriangle, ShieldAlert } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardLineSummary, useDashboardMultiSite } from '../hooks/useDashboardExtras';
import KpiCard from '../components/KpiCard';
import LineStatusDonut from '../components/LineStatusDonut';
import StatusBadge from '../components/StatusBadge';
import SiteSwitcher from '../components/SiteSwitcher';

function DashboardPmLineWeeklyPage() {
    usePageHeader({ title: 'Dashboard PM Monthly and Weekly' });

    const { hasPermission } = useAuth();
    const canSwitchSite = hasPermission('dashboard.multi_site');

    const { data: multiSite } = useDashboardMultiSite({ enabled: canSwitchSite });
    const sites = multiSite ?? [];
    const [selectedSiteId, setSelectedSiteId] = useState(null);

    const remoteSite = selectedSiteId ? sites.find((s) => s.site_id === selectedSiteId) : null;
    const isRemoteView = !!remoteSite;

    const local = useDashboardLineSummary();

    const data = isRemoteView ? remoteSite.data?.line_summary : local.data;
    const isLoading = isRemoteView ? false : local.isLoading;
    const isError = isRemoteView ? false : local.isError;

    if (isError) {
        return (
            <div className="rounded-lg bg-danger-dim px-4 py-5 text-center text-danger">
                Gagal memuat dashboard PM Monthly and Weekly. Coba lagi.
            </div>
        );
    }

    if (isRemoteView && !remoteSite.data) {
        return (
            <div className="flex flex-col gap-5">
                <SiteSwitcher sites={sites} selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />
                <div className="px-4 py-5 text-center text-[var(--text-faint)]">
                    Belum pernah berhasil narik data dari {remoteSite.site_label}.
                    {remoteSite.error && ` (${remoteSite.error})`}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            <SiteSwitcher sites={sites} selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />

            {isLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="flex h-[148px] items-center justify-center rounded-lg border border-border bg-card text-[var(--text-faint)]"
                        >
                            ...
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <KpiCard icon={<Factory size={18} />} label="Total Line" value={data.total_lines} status="accent" />
                    <KpiCard
                        icon={<AlertTriangle size={18} />}
                        label="Perlu Perhatian (Monthly)"
                        value={data.monthly.WARNING + data.monthly.DANGER}
                        caption={`${data.monthly.DANGER} danger, ${data.monthly.WARNING} warning`}
                        status="warn"
                    />
                    <KpiCard
                        icon={<ShieldAlert size={18} />}
                        label="Perlu Perhatian (Weekly)"
                        value={data.weekly.WARNING + data.weekly.DANGER}
                        caption={`${data.weekly.DANGER} danger, ${data.weekly.WARNING} warning`}
                        status="danger"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-4.5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">Status Monthly</h2>
                    </div>
                    {!isLoading && (
                        <LineStatusDonut
                            healthy={data.monthly.OK}
                            warning={data.monthly.WARNING}
                            critical={data.monthly.DANGER}
                            totalLabel="Total Line"
                        />
                    )}
                </div>

                <div className="rounded-lg border border-border bg-card p-4.5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">Status Weekly</h2>
                    </div>
                    {!isLoading && (
                        <LineStatusDonut
                            healthy={data.weekly.OK}
                            warning={data.weekly.WARNING}
                            critical={data.weekly.DANGER}
                            totalLabel="Total Line"
                        />
                    )}
                </div>
            </div>

            {!isLoading && (
                <div className="rounded-lg border border-border bg-card p-4.5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">Line Butuh Perhatian</h2>
                    </div>
                    {data.attention.length === 0 ? (
                        <div className="px-4 py-5.5 text-center text-[var(--text-faint)]">
                            Semua Line dalam status OK.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        {['Line', 'Sisa Hari Monthly', 'Status Monthly', 'Sisa Hari Weekly', 'Status Weekly'].map(
                                            (h) => (
                                                <th
                                                    key={h}
                                                    className="border-b border-border px-2.5 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]"
                                                >
                                                    {h}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.attention.map((line) => (
                                        <tr key={line.line_id} className="hover:bg-[var(--panel-2)]">
                                            <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px]">
                                                {line.line_name}
                                            </td>
                                            <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px]">
                                                {line.sisa_hari_monthly ?? '-'}
                                            </td>
                                            <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5">
                                                <StatusBadge status={line.status_monthly} />
                                            </td>
                                            <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px]">
                                                {line.sisa_hari_weekly ?? '-'}
                                            </td>
                                            <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5">
                                                <StatusBadge status={line.status_weekly} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default DashboardPmLineWeeklyPage;
