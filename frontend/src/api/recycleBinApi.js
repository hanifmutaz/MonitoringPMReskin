// src/api/recycleBinApi.js
import apiClient from './client';

export async function fetchRecycleBinEntities() {
  const { data } = await apiClient.get('/recycle-bin');
  return data.data;
}

export async function fetchDeletedItems(entity) {
  const { data } = await apiClient.get(`/recycle-bin/${entity}`);
  return data.data;
}

export async function restoreItem(entity, id) {
  const { data } = await apiClient.post(`/recycle-bin/${entity}/${id}/restore`);
  return data.data;
}

export async function permanentDeleteItem(entity, id) {
  await apiClient.delete(`/recycle-bin/${entity}/${id}`);
}

// Bulk soft-delete (checkbox massal) - endpoint sama dipakai tiap tabel
// Master Data (LinesTab, PartsTab, dst) lewat useBulkDeleteMutation, BUKAN
// cuma dari halaman Recycle Bin.
export async function bulkDeleteItems(entity, ids) {
  const { data } = await apiClient.post(`/recycle-bin/${entity}/bulk-delete`, { ids });
  return data.data;
}