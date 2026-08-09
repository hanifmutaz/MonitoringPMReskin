// src/components/FooterStatusBar.jsx
import { useQuery } from '@tanstack/react-query';
import { fetchSyncStatus } from '../api/dashboardApi';

function FooterStatusBar() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'sync-status'],
    queryFn: fetchSyncStatus,
    refetchInterval: 60 * 1000,
  });

  const label =
    data?.status === 'success'
      ? `Database Sync: Optimal (terakhir ${new Date(data.last_synced_at).toLocaleString('id-ID')})`
      : 'Database Sync: Belum ada data';

  return (
    <footer className="footer-status-bar">
      <span>{label}</span>
      <span>&copy; {new Date().getFullYear()} Hirose Indonesia — PM Monitoring Web App</span>
    </footer>
  );
}

export default FooterStatusBar;
