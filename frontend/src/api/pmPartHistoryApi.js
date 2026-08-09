// src/api/pmPartHistoryApi.js
import apiClient from './client';

export async function fetchPmPartHistoryList(params) {
  const { data } = await apiClient.get('/pm-part-history', { params });
  return data.data; // { items, total, page, limit }
}

export async function createPmPartHistory(payload) {
  const { data } = await apiClient.post('/pm-part-history', payload);
  return data.data;
}
