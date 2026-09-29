// src/api/pmLineApi.js
import apiClient from './client';

export async function updatePmLineLastDate({ lineId, ...payload }) {
  const { data } = await apiClient.patch(`/pm-line/${lineId}/last-date`, payload);
  return data.data;
}

export async function fetchPmLineStatus(params) {
  const { data } = await apiClient.get('/pm-line', { params });
  return data.data;
}
