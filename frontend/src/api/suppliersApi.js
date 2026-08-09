// src/api/suppliersApi.js
import apiClient from './client';

export async function fetchSuppliers({ isActive, search } = {}) {
  const { data } = await apiClient.get('/suppliers', { params: { is_active: isActive, search } });
  return data.data;
}

export async function createSupplier(payload) {
  const { data } = await apiClient.post('/suppliers', payload);
  return data.data;
}

export async function updateSupplier(id, payload) {
  const { data } = await apiClient.patch(`/suppliers/${id}`, payload);
  return data.data;
}

export async function deleteSupplier(id) {
  await apiClient.delete(`/suppliers/${id}`);
}
