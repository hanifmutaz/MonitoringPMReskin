// src/hooks/useUsers.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, createUser, updateUser, approveUser, rejectUser } from '../api/usersApi';

export function useUsers(params) {
  return useQuery({ queryKey: ['users', params], queryFn: () => fetchUsers(params) });
}

export function useUserMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const create = useMutation({ mutationFn: createUser, onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, payload }) => updateUser(id, payload), onSuccess: invalidate });
  const approve = useMutation({ mutationFn: ({ id, roleId }) => approveUser(id, roleId), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: (id) => rejectUser(id), onSuccess: invalidate });

  return { create, update, approve, reject };
}
