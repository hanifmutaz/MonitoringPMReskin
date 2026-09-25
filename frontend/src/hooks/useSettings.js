// src/hooks/useSettings.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSettings, updateSetting, updateSettingAccess, syncConmasNow } from '../api/settingsApi';

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }) => updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      // Threshold/skema poin/cap dsb dipakai di PM Part & PM Line - kalau
      // Admin ubah setting, angka status yang lagi ditampilin di halaman
      // lain harus ikut kehitung ulang, bukan basi.
      queryClient.invalidateQueries({ queryKey: ['pm-part'] });
      queryClient.invalidateQueries({ queryKey: ['pm-line'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Admin only - ngatur role non-Admin mana yang boleh edit 1 setting key.
export function useUpdateSettingAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, roleIds }) => updateSettingAccess(key, roleIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}

// Trigger manual sync ConMas - gak invalidate ['settings'] (settings-nya
// sendiri gak berubah), tapi hasil sync mempengaruhi angka PM Part/PM Line/
// Dashboard (production_cache baru + akumulasi poin ke-recompute), sama
// invalidation-nya dengan useUpdateSetting di atas.
export function useSyncConmasNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncConmasNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-part'] });
      queryClient.invalidateQueries({ queryKey: ['pm-line'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
