// src/hooks/useSupplierMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupplier, updateSupplier, deleteSupplier } from '../api/suppliersApi';

export function useSupplierMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['suppliers'] });

  const create = useMutation({ mutationFn: createSupplier, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, payload }) => updateSupplier(id, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteSupplier, onSuccess: invalidate });

  return { create, update, remove };
}
