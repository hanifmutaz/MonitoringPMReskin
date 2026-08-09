// src/hooks/useLineMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLine, updateLine, deleteLine } from '../api/linesApi';

export function useLineMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['lines'] });

  const create = useMutation({ mutationFn: createLine, onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, payload }) => updateLine(id, payload), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteLine, onSuccess: invalidate });

  return { create, update, remove };
}
