// src/hooks/useTvDashboard.js
// Data buat mode TV (monitor area teknisi). Pakai endpoint dashboard yang
// sudah ada (view-only), cuma ditambah auto-refresh. refetchIntervalInBackground
// true supaya tetap update walau tab TV tidak sedang fokus.
import { useQuery } from '@tanstack/react-query';
import { fetchLineSummary, fetchPartSummary, fetchUpcoming, fetchSyncStatus } from '../api/dashboardApi';

const REFRESH_MS = 60_000;

const tvOptions = {
  refetchInterval: REFRESH_MS,
  refetchIntervalInBackground: true,
  retry: 2,
};

export function useTvLineSummary() {
  return useQuery({ queryKey: ['dashboard', 'line-summary'], queryFn: fetchLineSummary, ...tvOptions });
}

export function useTvPartSummary() {
  return useQuery({ queryKey: ['dashboard', 'part-summary'], queryFn: fetchPartSummary, ...tvOptions });
}

export function useTvUpcoming() {
  return useQuery({ queryKey: ['dashboard', 'upcoming'], queryFn: fetchUpcoming, ...tvOptions });
}

export function useTvSyncStatus() {
  return useQuery({ queryKey: ['dashboard', 'sync-status'], queryFn: fetchSyncStatus, ...tvOptions });
}
