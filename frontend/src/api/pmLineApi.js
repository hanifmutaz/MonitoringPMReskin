// src/api/pmLineApi.js
import apiClient from './client';

export async function fetchPmLineStatus(params) {
  const { data } = await apiClient.get('/pm-line', { params });
  return data.data;
}
