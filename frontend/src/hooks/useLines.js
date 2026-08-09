// src/hooks/useLines.js
import { useQuery } from '@tanstack/react-query';
import { fetchLines } from '../api/linesApi';

export function useLines({ isActive = true } = {}) {
  return useQuery({
    queryKey: ['lines', { isActive }],
    queryFn: () => fetchLines({ isActive }),
  });
}
