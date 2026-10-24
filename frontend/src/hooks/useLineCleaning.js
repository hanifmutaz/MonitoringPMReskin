// src/hooks/useLineCleaning.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLineCleaning } from '../api/lineCleaningApi';

export function useCreateLineCleaning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLineCleaning,
    // Cleaning me-reset hitungan interval -> panel Line Tidak Running harus ikut segar.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
