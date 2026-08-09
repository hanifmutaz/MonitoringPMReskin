// src/api/inventoryApi.js
import apiClient from './client';

export async function fetchInventoryItems(params) {
  const { data } = await apiClient.get('/inventory', { params });
  return data.data; // { items, total, page, limit }
}

export async function fetchInventoryRopStatus() {
  const { data } = await apiClient.get('/inventory/rop-status');
  return data.data; // array item + konsumsi_spare_per_hari, kebutuhan_spare, safety_stock, rop, order_qty, status
}

export async function fetchInventoryItem(id) {
  const { data } = await apiClient.get(`/inventory/${id}`);
  return data.data;
}

export async function fetchInventoryMovements(id, params) {
  const { data } = await apiClient.get(`/inventory/${id}/movements`, { params });
  return data.data;
}

export async function fetchAllInventoryMovements(params) {
  const { data } = await apiClient.get('/inventory/movements/all', { params });
  return data.data; // { items, total, page, limit }
}

export async function createInventoryItem(payload) {
  const { data } = await apiClient.post('/inventory', payload);
  return data.data;
}

export async function updateInventoryItem(id, payload) {
  const { data } = await apiClient.patch(`/inventory/${id}`, payload);
  return data.data;
}

export async function adjustInventoryStock(id, payload) {
  const { data } = await apiClient.post(`/inventory/${id}/adjust-stock`, payload);
  return data.data;
}

export async function deleteInventoryItem(id) {
  await apiClient.delete(`/inventory/${id}`);
}

export async function linkPartToInventoryItem(partId, inventoryItemId) {
  const { data } = await apiClient.patch(`/parts/${partId}/inventory-link`, { inventory_item_id: inventoryItemId });
  return data.data;
}