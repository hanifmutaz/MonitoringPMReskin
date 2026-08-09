// src/hooks/useSuppliers.js
import { useQuery } from '@tanstack/react-query';
import { fetchSuppliers } from '../api/suppliersApi';

export function useSuppliers({ isActive, search } = {}) {
  return useQuery({
    queryKey: ['suppliers', { isActive, search }],
    queryFn: () => fetchSuppliers({ isActive, search }),
  });
}
