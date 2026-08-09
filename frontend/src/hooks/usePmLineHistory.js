// src/hooks/usePmLineHistory.js
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { fetchPmLineHistoryList, createPmLineHistory } from '../api/pmLineHistoryApi';

export function usePmLineHistoryList(params) {
  return useQuery({
    queryKey: ['pm-line-history', params],
    queryFn: () => fetchPmLineHistoryList(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreatePmLineHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPmLineHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-line-history'] });
      queryClient.invalidateQueries({ queryKey: ['pm-line'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
