// src/hooks/usePartSuppliers.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPartSuppliers,
  createPartSupplier,
  updatePartSupplierNotes,
  setPartSupplierPrimary,
  deletePartSupplier,
} from '../api/partSuppliersApi';

export function usePartSuppliers(partId) {
  return useQuery({
    queryKey: ['part-suppliers', partId],
    queryFn: () => fetchPartSuppliers(partId),
    enabled: !!partId,
  });
}

export function usePartSupplierMutations(partId) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['part-suppliers', partId] });
    queryClient.invalidateQueries({ queryKey: ['parts'] }); // supplier_count ikut berubah
  };

  const create = useMutation({
    mutationFn: (payload) => createPartSupplier(partId, payload),
    onSuccess: invalidate,
  });
  const updateNotes = useMutation({
    mutationFn: ({ id, notes }) => updatePartSupplierNotes(id, notes),
    onSuccess: invalidate,
  });
  const setPrimary = useMutation({
    mutationFn: ({ id, isPrimary }) => setPartSupplierPrimary(id, isPrimary),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deletePartSupplier, onSuccess: invalidate });

  return { create, updateNotes, setPrimary, remove };
}
