// src/hooks/useDashboardSummary.js
import { useQuery } from '@tanstack/react-query';
import { fetchSummary } from '../api/dashboardApi';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchSummary,
  });
}
