// src/hooks/useInventoryMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventoryStock,
  linkPartToInventoryItem,
} from '../api/inventoryApi';

export function useInventoryMutations() {
  const queryClient = useQueryClient();
  const invalidate = (id) => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    if (id) {
      queryClient.invalidateQueries({ queryKey: ['inventory-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements', id] });
    }
    queryClient.invalidateQueries({ queryKey: ['parts'] });
  };

  const create = useMutation({ mutationFn: createInventoryItem, onSuccess: () => invalidate() });
  const update = useMutation({
    mutationFn: ({ id, payload }) => updateInventoryItem(id, payload),
    onSuccess: (_, { id }) => invalidate(id),
  });
  const remove = useMutation({ mutationFn: deleteInventoryItem, onSuccess: () => invalidate() });
  const adjustStock = useMutation({
    mutationFn: ({ id, payload }) => adjustInventoryStock(id, payload),
    onSuccess: (_, { id }) => invalidate(id),
  });
  const linkPart = useMutation({
    mutationFn: ({ partId, inventoryItemId }) => linkPartToInventoryItem(partId, inventoryItemId),
    onSuccess: () => invalidate(),
  });

  return { create, update, remove, adjustStock, linkPart };
}
