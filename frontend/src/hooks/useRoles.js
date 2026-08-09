// src/hooks/useRoles.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRoles,
  fetchPermissionCatalog,
  createRole,
  updateRole,
  updateRolePermissions,
  deleteRole,
} from '../api/rolesApi';

export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: fetchRoles });
}

export function usePermissionCatalog() {
  return useQuery({ queryKey: ['permission-catalog'], queryFn: fetchPermissionCatalog });
}

export function useRoleMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['roles'] });

  const create = useMutation({ mutationFn: createRole, onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, payload }) => updateRole(id, payload), onSuccess: invalidate });
  const updatePermissions = useMutation({
    mutationFn: ({ id, permissions }) => updateRolePermissions(id, permissions),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteRole, onSuccess: invalidate });

  return { create, update, updatePermissions, remove };
}
