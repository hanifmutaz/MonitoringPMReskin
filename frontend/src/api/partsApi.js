// src/api/partsApi.js
import apiClient from './client';

export async function fetchParts(params) {
  const { data } = await apiClient.get('/parts', { params });
  return data.data; // { items, total, page, limit }
}

export async function createPart(payload) {
  const { data } = await apiClient.post('/parts', payload);
  return data.data;
}

export async function updatePart(id, payload) {
  const { data } = await apiClient.patch(`/parts/${id}`, payload);
  return data.data;
}

export async function deletePart(id) {
  await apiClient.delete(`/parts/${id}`);
}
