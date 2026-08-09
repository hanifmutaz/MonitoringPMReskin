// src/hooks/useSettings.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSettings, updateSetting } from '../api/settingsApi';

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
