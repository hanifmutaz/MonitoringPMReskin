// src/hooks/usePmLineStatus.js
import { useQuery } from '@tanstack/react-query';
import { fetchPmLineStatus } from '../api/pmLineApi';

export function usePmLineStatus(params) {
  return useQuery({
    queryKey: ['pm-line', params],
    queryFn: () => fetchPmLineStatus(params),
  });
}
