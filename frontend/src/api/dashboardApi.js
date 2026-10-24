// src/api/dashboardApi.js
import apiClient from './client';

export async function fetchSummary() {
  const { data } = await apiClient.get('/dashboard/summary');
  return data.data;
}

export async function fetchAttention() {
  const { data } = await apiClient.get('/dashboard/attention');
  return data.data;
}

export async function fetchUpcoming() {
  const { data } = await apiClient.get('/dashboard/upcoming');
  return data.data;
}

export async function fetchSyncStatus() {
  const { data } = await apiClient.get('/dashboard/sync-status');
  return data.data;
}

export async function fetchPartSummary() {
  const { data } = await apiClient.get('/dashboard/part-summary');
  return data.data;
}

export async function fetchLineSummary() {
  const { data } = await apiClient.get('/dashboard/line-summary');
  return data.data;
}

export async function fetchKetepatanAttention() {
  const { data } = await apiClient.get('/dashboard/ketepatan-attention');
  return data.data;
}

// Butuh permission 'dashboard.multi_site' - kalau backend balikin 403 (role
// gak punya akses), biarkan error itu naik apa adanya, ditangani di hook/page
// (bukan di-swallow di sini).
export async function fetchMultiSite() {
  const { data } = await apiClient.get('/dashboard/multi-site');
  return data.data;
}

// Line dengan PM terlambat (ringkas) + bukti keterlambatan 1 Line (data sistem).
export async function fetchLateLines() {
  const { data } = await apiClient.get('/dashboard/late-lines');
  return data.data;
}

export async function fetchLateLineEvidence(lineId) {
  const { data } = await apiClient.get(`/dashboard/late-lines/${lineId}/evidence`);
  return data.data;
}

// Line yang tidak running (tanpa output >= idle_min_days) + status cleaning.
export async function fetchIdleLines() {
  const { data } = await apiClient.get('/dashboard/idle-lines');
  return data.data;
}
