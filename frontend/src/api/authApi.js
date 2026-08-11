// src/api/authApi.js
import apiClient from './client';

export async function login(username, password) {
  const { data } = await apiClient.post('/auth/login', { username, password });
  return data.data; // { token, user: { id, username, full_name, role, permissions } }
}

export async function register(payload) {
  const { data } = await apiClient.post('/auth/register', payload);
  return data; // { success, message, data: { id, username, status } }
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

export async function fetchMe() {
  const { data } = await apiClient.get('/auth/me');
  return data.data; // { id, username, full_name, email, role, permissions }
}

/**
 * PATCH /auth/me - self-service, cuma full_name & email (lihat
 * profileService.js/authValidator.js di backend - field lain ditolak).
 */
export async function updateProfile(fields) {
  const { data } = await apiClient.patch('/auth/me', fields);
  return data.data;
}

/**
 * PATCH /auth/me/password - butuh currentPassword (diverifikasi backend
 * sebelum diganti).
 */
export async function changePassword(currentPassword, newPassword) {
  const { data } = await apiClient.patch('/auth/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return data;
}

/**
 * POST /auth/me/avatar - upload/ganti foto profil (opsional). `file` =
 * objek File dari <input type="file">. multipart/form-data - JANGAN set
 * Content-Type manual, biarkan browser/axios yang nentuin boundary-nya
 * sendiri (kalau di-set manual ke 'multipart/form-data' polos tanpa
 * boundary, request-nya bakal gagal diparse server).
 */
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  const { data } = await apiClient.post('/auth/me/avatar', formData);
  return data.data; // { avatar_url }
}

/**
 * DELETE /auth/me/avatar - hapus foto profil (balik ke fallback inisial).
 */
export async function deleteAvatar() {
  const { data } = await apiClient.delete('/auth/me/avatar');
  return data;
}
