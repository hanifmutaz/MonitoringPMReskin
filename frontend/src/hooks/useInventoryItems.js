// src/hooks/useInventoryItems.js
import { useQuery } from '@tanstack/react-query';
import { fetchInventoryItems, fetchInventoryRopStatus } from '../api/inventoryApi';

export function useInventoryItems(params) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => fetchInventoryItems(params),
  });
}

export function useInventoryRopStatus() {
  return useQuery({
    queryKey: ['inventory-rop-status'],
    queryFn: fetchInventoryRopStatus,
  });
}
