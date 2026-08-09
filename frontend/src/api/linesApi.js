// src/api/linesApi.js
import apiClient from './client';

export async function fetchLines({ isActive } = {}) {
  const { data } = await apiClient.get('/lines', { params: { is_active: isActive } });
  return data.data;
}

export async function createLine(payload) {
  const { data } = await apiClient.post('/lines', payload);
  return data.data;
}

export async function updateLine(id, payload) {
  const { data } = await apiClient.patch(`/lines/${id}`, payload);
  return data.data;
}

export async function deleteLine(id) {
  await apiClient.delete(`/lines/${id}`);
}
