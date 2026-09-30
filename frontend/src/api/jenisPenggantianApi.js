// src/api/jenisPenggantianApi.js
import apiClient from './client';

export async function fetchJenisPenggantian() {
  const { data } = await apiClient.get('/jenis-penggantian');
  return data.data;
}

export async function createJenisPenggantian(payload) {
  const { data } = await apiClient.post('/jenis-penggantian', payload);
  return data.data;
}

export async function updateJenisPenggantian(id, payload) {
  const { data } = await apiClient.patch(`/jenis-penggantian/${id}`, payload);
  return data.data;
}
