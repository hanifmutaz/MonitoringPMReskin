// src/api/clMappingApi.js
import apiClient from './client';

export async function fetchClMapping(partId) {
  const { data } = await apiClient.get(`/parts/${partId}/cl-mapping`);
  return data.data;
}

export async function createClMapping(partId, payload) {
  const { data } = await apiClient.post(`/parts/${partId}/cl-mapping`, payload);
  return data.data;
}

export async function deleteClMapping(id) {
  await apiClient.delete(`/cl-mapping/${id}`);
}
