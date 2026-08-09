// src/hooks/usePmPartHistory.js
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { fetchPmPartHistoryList, createPmPartHistory } from '../api/pmPartHistoryApi';

export function usePmPartHistoryList(params) {
  return useQuery({
    queryKey: ['pm-part-history', params],
    queryFn: () => fetchPmPartHistoryList(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreatePmPartHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPmPartHistory,
    onSuccess: () => {
      // Submit history ngubah counter PM Part (baseline tgl_ganti berubah)
      // dan bisa ngubah status Dashboard - invalidate semua query terkait
      // biar UI langsung sinkron, bukan nunggu refetch interval.
      queryClient.invalidateQueries({ queryKey: ['pm-part-history'] });
      queryClient.invalidateQueries({ queryKey: ['pm-part'] });
      queryClient.invalidateQueries({ queryKey: ['pm-part-ketepatan-per-line'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
