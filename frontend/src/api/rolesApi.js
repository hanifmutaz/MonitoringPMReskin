// src/api/rolesApi.js
import apiClient from './client';

export async function fetchRoles() {
  const { data } = await apiClient.get('/roles');
  return data.data; // [{ id, name, is_system, user_count, permissions }]
}

export async function fetchPermissionCatalog() {
  const { data } = await apiClient.get('/roles/permissions');
  return data.data; // [{ key, label, description }]
}

export async function createRole(payload) {
  const { data } = await apiClient.post('/roles', payload);
  return data.data;
}

export async function updateRole(id, payload) {
  const { data } = await apiClient.patch(`/roles/${id}`, payload);
  return data.data;
}

export async function updateRolePermissions(id, permissions) {
  const { data } = await apiClient.patch(`/roles/${id}/permissions`, { permissions });
  return data.data;
}

export async function deleteRole(id) {
  await apiClient.delete(`/roles/${id}`);
}
