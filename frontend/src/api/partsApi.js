// src/api/partsApi.js
import apiClient from './client';

export async function fetchParts(params) {
  const { data } = await apiClient.get('/parts', { params });
  return data.data; // { items, total, page, limit }
}

// Exact-match lookup by Drawing No - dipakai hasil scan barcode (kamera
// iPad) di Form PM Part. Beda dari fetchParts({search}) yang ILIKE partial.
export async function lookupPartsByDrawingNo(drawingNo) {
  const { data } = await apiClient.get('/parts/lookup', { params: { drawing_no: drawingNo } });
  return data.data; // array Part (bisa >1, lihat komentar backend)
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
