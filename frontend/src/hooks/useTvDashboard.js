// src/hooks/useTvDashboard.js
// Data buat mode TV (PM Monitoring, monitor/TV). Pakai endpoint dashboard yang
// sudah ada (view-only), cuma ditambah auto-refresh. refetchIntervalInBackground
// true supaya tetap update walau tab TV tidak sedang fokus.
import { useQuery } from '@tanstack/react-query';
import { fetchSummary, fetchLineSummary, fetchPartSummary, fetchUpcoming, fetchSyncStatus } from '../api/dashboardApi';
import { fetchInventoryRopStatus } from '../api/inventoryApi';

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

// Angka ringkas (dipakai buat PM Compliance / ketepatan PM tahun berjalan).
export function useTvSummary() {
  return useQuery({ queryKey: ['dashboard', 'summary'], queryFn: fetchSummary, ...tvOptions });
}

// Jumlah item inventory berstatus ORDER. Endpoint ini butuh permission inventory
// + Paket B, jadi WAJIB di-gate lewat `enabled` (kalau gak, nembak 403 tiap 60 detik).
export function useTvInventoryNeedOrder(enabled) {
  return useQuery({
    queryKey: ['inventory-rop-status'],
    queryFn: fetchInventoryRopStatus,
    select: (rows) => (rows ?? []).filter((r) => r.status === 'ORDER').length,
    enabled,
    ...tvOptions,
    retry: false,
  });
}
