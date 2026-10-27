// src/api/pmLineHistoryApi.js
import apiClient from './client';

export async function fetchPmLineHistoryList(params) {
  const { data } = await apiClient.get('/pm-line-history', { params });
  return data.data;
}

export async function createPmLineHistory(payload) {
  const { data } = await apiClient.post('/pm-line-history', payload);
  return data.data;
}

// Edit terbatas (remark/keterangan, PIC, alasan telat). Tanggal/counter/jenis tidak bisa diubah.
export async function updatePmLineHistory(id, payload) {
  const { data } = await apiClient.patch(`/pm-line-history/${id}`, payload);
  return data.data;
}
