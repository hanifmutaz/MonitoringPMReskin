// src/hooks/useDashboardSummary.js
import { useQuery } from '@tanstack/react-query';
import { fetchSummary } from '../api/dashboardApi';

// Auto-refresh 60 detik: dashboard sering dibiarkan terbuka di monitor
// (akun role Display), jadi data tidak boleh basi sampai ada yang reload.
const DASHBOARD_REFRESH = { refetchInterval: 60_000, refetchIntervalInBackground: true };

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchSummary,
    ...DASHBOARD_REFRESH,
  });
}
