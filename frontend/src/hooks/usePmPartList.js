// src/hooks/usePmPartList.js
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchPmPartList, fetchPmPartKetepatanPerLine } from '../api/pmPartApi';

export function usePmPartList(params) {
  return useQuery({
    queryKey: ['pm-part', params],
    queryFn: () => fetchPmPartList(params),
    placeholderData: keepPreviousData,
  });
}

export function usePmPartKetepatanPerLine() {
  return useQuery({
    queryKey: ['pm-part-ketepatan-per-line'],
    queryFn: fetchPmPartKetepatanPerLine,
  });
}
