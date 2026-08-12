// src/hooks/useNotifications.js
import { useQuery } from '@tanstack/react-query';
import { fetchRecentNotifications } from '../api/notificationApi';

// Polling 60 detik - notifikasi ini pasif (gak ada infrastruktur real-time/
// WebSocket di app ini), refetch berkala udah cukup buat badge angka di
// bell icon kerasa "up to date" tanpa perlu bangun infrastruktur baru
// buat 1 komponen kecil.
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchRecentNotifications(20),
    refetchInterval: 60000,
  });
}