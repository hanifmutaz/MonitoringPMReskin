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

// Semua Line dengan ketepatan PM < 100% (nilai terburuk Part/Monthly/Weekly). period: 'month' | 'year'.
export async function fetchKetepatanBelowTarget(period = 'month') {
  const { data } = await apiClient.get('/dashboard/ketepatan-below-target', { params: { period } });
  return data.data; // { period, items: [...] }
}

// Semua blok Ketepatan PM Dashboard Management untuk 1 bulan acuan (backdate). month 'YYYY-MM'; kosong = bulan ini.
// -> { month, year, current_month, is_current, start_date, bulan, tahun, by_month, trend, below_target }
export async function fetchKetepatanDashboard(month) {
  const { data } = await apiClient.get('/dashboard/ketepatan', { params: month ? { month } : {} });
  return data.data;
}

// Detail ketepatan < 100% 1 Line: PM mana yang telat di periode itu, telat berapa lama, PIC, alasan.
// month (opsional, 'YYYY-MM') = backdate: 'month' -> bulan itu, 'year' -> tahun dari bulan itu.
export async function fetchKetepatanLateEvents(lineId, period = 'month', month) {
  const params = month ? { period, month } : { period };
  const { data } = await apiClient.get(`/dashboard/ketepatan-below-target/${lineId}/events`, { params });
  return data.data; // { line_id, line_name, period, date_from, date_to, events: [...] }
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
