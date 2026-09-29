// src/hooks/usePmLineStatus.js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPmLineStatus, updatePmLineLastDate } from '../api/pmLineApi';

export function usePmLineStatus(params) {
  return useQuery({
    queryKey: ['pm-line', params],
    queryFn: () => fetchPmLineStatus(params),
  });
}

export function useUpdatePmLineLastDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePmLineLastDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-line'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
