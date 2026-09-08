// src/components/FooterStatusBar.jsx
// Fase 1 (A1/D3): "terakhir sync" pakai formatDateTime() -> "04 Jul 2026, 14:30"
// (bukan toLocaleString mentah).
import { useQuery } from '@tanstack/react-query';
import { fetchSyncStatus } from '../api/dashboardApi';
import { formatDateTime } from '../utils/formatDate';

function FooterStatusBar() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'sync-status'],
    queryFn: fetchSyncStatus,
    refetchInterval: 60 * 1000,
  });

  const label =
    data?.status === 'success'
      ? `Database Sync: Optimal (terakhir ${formatDateTime(data.last_synced_at)})`
      : 'Database Sync: Belum ada data';

  return (
    <footer className="footer-status-bar">
      <span>{label}</span>
      <span>&copy; {new Date().getFullYear()} Hirose Indonesia — PM Monitoring Web App</span>
    </footer>
  );
}

export default FooterStatusBar;
