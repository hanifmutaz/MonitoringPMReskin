// src/hooks/usePartMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPart, updatePart, deletePart } from '../api/partsApi';

export function usePartMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['parts'] });
    queryClient.invalidateQueries({ queryKey: ['pm-part'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const create = useMutation({ mutationFn: createPart, onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, payload }) => updatePart(id, payload), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deletePart, onSuccess: invalidate });

  return { create, update, remove };
}
