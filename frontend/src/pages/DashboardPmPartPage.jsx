// src/pages/DashboardPmPartPage.jsx
// Reskin (checklist §3 item 3, batch terakhir - nyusul DashboardPage.jsx
// yang udah duluan): `.panel`/`.panel-header`/`.panel-title`/`.data-table`/
// `.kpi-grid`/`.empty-state`/`.error-state`/inline style color:var(--ok|warn|
// danger) lama dilepas TOTAL, diganti Tailwind murni (text-ok/text-warn/
// text-danger). Layout persis NGIKUTIN pola DashboardPage.jsx (rounded-lg
// border-border bg-card p-4.5, judul text-[15px] font-semibold). Data/logic
// (hook, multi-site switching, permission gating) TIDAK berubah sama sekali.
import { useState } from 'react';
import { Package, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardPartSummary, useDashboardMultiSite } from '../hooks/useDashboardExtras';
import KpiCard from '../components/KpiCard';
import LineStatusDonut from '../components/LineStatusDonut';
import CriticalAlertsPanel from '../components/CriticalAlertsPanel';
import SiteSwitcher from '../components/SiteSwitcher';

function DashboardPmPartPage() {
    usePageHeader({ title: 'Dashboard PM Part' });

    const { hasPermission } = useAuth();
    const canSwitchSite = hasPermission('dashboard.multi_site');

    const { data: multiSite } = useDashboardMultiSite({ enabled: canSwitchSite });
    const sites = multiSite ?? [];
    const [selectedSiteId, setSelectedSiteId] = useState(null);

    const remoteSite = selectedSiteId ? sites.find((s) => s.site_id === selectedSiteId) : null;
    const isRemoteView = !!remoteSite;

    const local = useDashboardPartSummary();

    const data = isRemoteView ? remoteSite.data?.part_summary : local.data;
    const isLoading = isRemoteView ? false : local.isLoading;
    const isError = isRemoteView ? false : local.isError;

    if (isError) {
        return (
            <div className="rounded-lg bg-danger-dim px-4 py-5 text-center text-danger">
                Gagal memuat dashboard PM Part. Coba lagi.
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="flex h-[148px] items-center justify-center rounded-lg border border-border bg-card text-[var(--text-faint)]"
                        >
                            ...
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        icon={<Package size={18} />}
                        label="Total Parts"
                        value={data.total_parts.toLocaleString('id-ID')}
                        status="accent"
                    />
                    <KpiCard
                        icon={<CheckCircle2 size={18} />}
                        label="Status OK"
                        value={data.status_ok.toLocaleString('id-ID')}
                        status="accent"
                    />
                    <KpiCard
                        icon={<AlertTriangle size={18} />}
                        label="Status Warning"
                        value={data.status_warning.toLocaleString('id-ID')}
                        status="warn"
                    />
                    <KpiCard
                        icon={<ShieldAlert size={18} />}
                        label="Status Danger"
                        value={data.status_danger.toLocaleString('id-ID')}
                        status="danger"
                    />
                </div>
            )}

            <div className="rounded-lg border border-border bg-card p-4.5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">Ringkasan Status Part</h2>
                </div>
                {!isLoading && (
                    <LineStatusDonut
                        healthy={data.status_ok}
                        warning={data.status_warning}
                        critical={data.status_danger}
                        totalLabel="Total Part"
                    />
                )}
            </div>

            {!isLoading && data.per_line.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4.5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">Breakdown per Line</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    {['Line', 'OK', 'Warning', 'Danger'].map((h) => (
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
                                {data.per_line.map((l) => (
                                    <tr key={l.line_name} className="hover:bg-[var(--panel-2)]">
                                        <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px]">
                                            {l.line_name}
                                        </td>
                                        <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px] text-ok">
                                            {l.OK}
                                        </td>
                                        <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px] text-warn">
                                            {l.WARNING}
                                        </td>
                                        <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px] text-danger">
                                            {l.DANGER}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!isLoading && <CriticalAlertsPanel items={data.top_attention} />}
        </div>
    );
}

export default DashboardPmPartPage;
