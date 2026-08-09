// src/api/pmPartApi.js
import apiClient from './client';

export async function fetchPmPartList(params) {
  const { data } = await apiClient.get('/pm-part', { params });
  return data.data; // { items, total, page, limit }
}

export async function fetchPmPartDetail(partId) {
  const { data } = await apiClient.get(`/pm-part/${partId}`);
  return data.data;
}

export async function fetchPmPartKetepatanPerLine() {
  const { data } = await apiClient.get('/pm-part/ketepatan-per-line');
  return data.data;
}
