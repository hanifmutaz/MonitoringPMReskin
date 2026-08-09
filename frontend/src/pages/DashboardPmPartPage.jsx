// src/pages/DashboardPmPartPage.jsx
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
        return <div className="error-state">Gagal memuat dashboard PM Part. Coba lagi.</div>;
    }

    if (isRemoteView && !remoteSite.data) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <SiteSwitcher sites={sites} selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />
                <div className="empty-state">
                    Belum pernah berhasil narik data dari {remoteSite.site_label}.
                    {remoteSite.error && ` (${remoteSite.error})`}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SiteSwitcher sites={sites} selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />

            {isLoading ? (
                <div className="kpi-grid">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="kpi-card empty-state">
                            ...
                        </div>
                    ))}
                </div>
            ) : (
                <div className="kpi-grid">
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

            <div className="panel">
                <div className="panel-header">
                    <h2 className="panel-title">Ringkasan Status Part</h2>
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
                <div className="panel">
                    <div className="panel-header">
                        <h2 className="panel-title">Breakdown per Line</h2>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Line</th>
                                <th className="mono">OK</th>
                                <th className="mono">Warning</th>
                                <th className="mono">Danger</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.per_line.map((l) => (
                                <tr key={l.line_name}>
                                    <td className="mono">{l.line_name}</td>
                                    <td className="mono" style={{ color: 'var(--ok)' }}>{l.OK}</td>
                                    <td className="mono" style={{ color: 'var(--warn)' }}>{l.WARNING}</td>
                                    <td className="mono" style={{ color: 'var(--danger)' }}>{l.DANGER}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!isLoading && <CriticalAlertsPanel items={data.top_attention} />}
        </div>
    );
}

export default DashboardPmPartPage;
