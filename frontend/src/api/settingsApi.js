// src/api/settingsApi.js
import apiClient from './client';

export async function fetchSettings() {
  const { data } = await apiClient.get('/settings');
  return data.data;
}

export async function updateSetting(key, value) {
  const { data } = await apiClient.patch(`/settings/${key}`, { value });
  return data.data;
}
