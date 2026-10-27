// src/hooks/useDashboardExtras.js
import { useQuery } from '@tanstack/react-query';
import {
  fetchAttention,
  fetchUpcoming,
  fetchPartSummary,
  fetchLineSummary,
  fetchKetepatanAttention,
  fetchKetepatanBelowTarget,
  fetchLateLines,
  fetchLateLineEvidence,
  fetchIdleLines,
  fetchMultiSite,
} from '../api/dashboardApi';

// Auto-refresh 60 detik, alasan sama dengan useDashboardSummary.
const DASHBOARD_REFRESH = { refetchInterval: 60_000, refetchIntervalInBackground: true };

export function useDashboardAttention() {
  return useQuery({ queryKey: ['dashboard', 'attention'], queryFn: fetchAttention, ...DASHBOARD_REFRESH });
}

export function useDashboardUpcoming() {
  return useQuery({ queryKey: ['dashboard', 'upcoming'], queryFn: fetchUpcoming, ...DASHBOARD_REFRESH });
}

export function useDashboardPartSummary() {
  return useQuery({ queryKey: ['dashboard', 'part-summary'], queryFn: fetchPartSummary, ...DASHBOARD_REFRESH });
}

export function useDashboardLineSummary() {
  return useQuery({ queryKey: ['dashboard', 'line-summary'], queryFn: fetchLineSummary, ...DASHBOARD_REFRESH });
}

export function useDashboardKetepatanAttention() {
  return useQuery({ queryKey: ['dashboard', 'ketepatan-attention'], queryFn: fetchKetepatanAttention, ...DASHBOARD_REFRESH });
}

export function useDashboardKetepatanBelowTarget(period = 'month') {
  return useQuery({
    queryKey: ['dashboard', 'ketepatan-below-target', period],
    queryFn: () => fetchKetepatanBelowTarget(period),
    ...DASHBOARD_REFRESH,
  });
}

export function useDashboardLateLines() {
  return useQuery({ queryKey: ['dashboard', 'late-lines'], queryFn: fetchLateLines, ...DASHBOARD_REFRESH });
}

export function useDashboardIdleLines() {
  return useQuery({ queryKey: ['dashboard', 'idle-lines'], queryFn: fetchIdleLines, ...DASHBOARD_REFRESH });
}

// Evidence hanya diambil saat modal dibuka (lineId terisi); tanpa auto-refresh
// karena ini bukti per kejadian, bukan angka live di dashboard.
export function useLateLineEvidence(lineId) {
  return useQuery({
    queryKey: ['dashboard', 'late-lines', lineId, 'evidence'],
    queryFn: () => fetchLateLineEvidence(lineId),
    enabled: Boolean(lineId),
  });
}

// Refetch tiap 60 detik - dipake sebagai site switcher di 3 halaman
// dashboard (Management/PM Part/PM Monthly-Weekly), kemungkinan dibuka lama
// pas meeting review, dan datanya sendiri gak realtime (Internal narik data
// Subcont per-request, bukan push). retry: false karena kalau 1 Subcont
// down, backend UDAH handle itu di level multiSiteService (balikin status
// 'unreachable' + HTTP 200) - retry di sini cuma relevan buat error
// jaringan/permission (403) yang emang gak akan berubah kalau di-retry.
//
// `enabled` WAJIB di-pass false kalau user gak punya permission
// 'dashboard.multi_site' atau instance ini bukan Internal - kalau gak,
// tiap halaman bakal nembak request yang pasti 403 terus-terusan tiap 60
// detik buat user yang emang gak akan pernah bisa akses ini.
export function useDashboardMultiSite({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['dashboard', 'multi-site'],
    queryFn: fetchMultiSite,
    refetchInterval: 60_000,
    retry: false,
    enabled,
  });
}