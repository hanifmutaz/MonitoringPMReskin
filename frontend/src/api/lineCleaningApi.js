// src/api/lineCleaningApi.js
import apiClient from './client';

export async function fetchLineCleaningList(lineId) {
  const { data } = await apiClient.get('/line-cleaning', { params: { line_id: lineId } });
  return data.data;
}

export async function createLineCleaning(payload) {
  const { data } = await apiClient.post('/line-cleaning', payload);
  return data.data;
}
