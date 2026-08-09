// src/hooks/useInventoryItemDetail.js
import { useQuery } from '@tanstack/react-query';
import { fetchInventoryItem, fetchInventoryMovements, fetchAllInventoryMovements } from '../api/inventoryApi';

export function useInventoryItemDetail(id) {
  return useQuery({
    queryKey: ['inventory-detail', id],
    queryFn: () => fetchInventoryItem(id),
    enabled: !!id,
  });
}

export function useInventoryMovements(id, params) {
  return useQuery({
    queryKey: ['inventory-movements', id, params],
    queryFn: () => fetchInventoryMovements(id, params),
    enabled: !!id,
  });
}

export function useAllInventoryMovements(params) {
  return useQuery({
    queryKey: ['inventory-movements-all', params],
    queryFn: () => fetchAllInventoryMovements(params),
  });
}