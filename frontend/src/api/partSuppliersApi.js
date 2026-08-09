// src/api/partSuppliersApi.js
import apiClient from './client';

export async function fetchPartSuppliers(partId) {
  const { data } = await apiClient.get(`/parts/${partId}/suppliers`);
  return data.data;
}

export async function createPartSupplier(partId, payload) {
  const { data } = await apiClient.post(`/parts/${partId}/suppliers`, payload);
  return data.data;
}

export async function updatePartSupplierNotes(id, notes) {
  const { data } = await apiClient.patch(`/part-suppliers/${id}/notes`, { notes });
  return data.data;
}

export async function setPartSupplierPrimary(id, isPrimary) {
  const { data } = await apiClient.patch(`/part-suppliers/${id}/primary`, { is_primary: isPrimary });
  return data.data;
}

export async function deletePartSupplier(id) {
  await apiClient.delete(`/part-suppliers/${id}`);
}
