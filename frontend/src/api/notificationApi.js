// src/api/notificationApi.js
import apiClient from './client';

/**
 * GET /notifications - notifikasi terbaru (PM Part Danger, Inventory
 * Order) buat dropdown bell icon. Balikannya { items, recent_24h_count } -
 * lihat notificationService.getRecentNotifications() di backend.
 */
export async function fetchRecentNotifications(limit = 20) {
  const { data } = await apiClient.get('/notifications', { params: { limit } });
  return data.data;
}