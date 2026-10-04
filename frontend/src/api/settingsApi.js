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

// Admin only (roleMiddleware di backend) - ngatur role NON-Admin mana yang
// boleh edit setting key ini (setting_role_access, migration 1700000022000).
export async function updateSettingAccess(key, roleIds) {
  const { data } = await apiClient.patch(`/settings/${key}/access`, { role_ids: roleIds });
  return data.data;
}

// Admin only - trigger manual sync ConMas (production_cache + recompute
// akumulasi poin Monthly + snapshot status PM Part), dipakai tombol "Sync
// Sekarang" di kategori "Sync Data Produksi" (nunggu jadwal cron kelamaan
// pas testing).
export async function syncConmasNow() {
  const { data } = await apiClient.post('/settings/sync-conmas');
  return data.data;
}

// Admin only - backup OTOMATIS yang tersimpan di server (BACKUP_DIR). Jadwalnya
// diatur lewat updateSetting (key backup_auto_*); file didownload lewat
// downloadFile('/settings/backup/auto/files/<nama>').
export async function fetchAutoBackupStatus() {
  const { data } = await apiClient.get('/settings/backup/auto');
  return data.data; // { last_run, files, running }
}

export async function runAutoBackupNow() {
  const { data } = await apiClient.post('/settings/backup/auto/run');
  return data.data;
}
