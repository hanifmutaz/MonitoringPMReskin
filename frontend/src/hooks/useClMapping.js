// src/hooks/useClMapping.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClMapping, createClMapping, deleteClMapping } from '../api/clMappingApi';

export function useClMapping(partId) {
  return useQuery({
    queryKey: ['cl-mapping', partId],
    queryFn: () => fetchClMapping(partId),
    enabled: !!partId,
  });
}

export function useClMappingMutations(partId) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cl-mapping', partId] });
    queryClient.invalidateQueries({ queryKey: ['parts'] }); // cl_count ikut berubah
  };

  const create = useMutation({ mutationFn: (payload) => createClMapping(partId, payload), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteClMapping, onSuccess: invalidate });

  return { create, remove };
}
