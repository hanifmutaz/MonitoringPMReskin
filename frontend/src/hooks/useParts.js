// src/hooks/useParts.js
import { useQuery } from '@tanstack/react-query';
import { fetchParts } from '../api/partsApi';

export function useParts(params) {
  return useQuery({
    queryKey: ['parts', params],
    queryFn: () => fetchParts(params),
  });
}
