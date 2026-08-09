// src/hooks/useMasterDataImportMutations.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { previewImport, commitImport } from '../api/masterDataImportApi';

export function useMasterDataImportMutations() {
  const queryClient = useQueryClient();

  const preview = useMutation({ mutationFn: previewImport });

  const commit = useMutation({
    mutationFn: commitImport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['pm-part'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return { preview, commit };
}
