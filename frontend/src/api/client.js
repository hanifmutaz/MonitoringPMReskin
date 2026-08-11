// src/api/client.js
import axios from 'axios';

// withCredentials WAJIB true - JWT disimpan httpOnly cookie (keputusan
// 06_ENVIRONMENT_AND_BOOTSTRAP.md §3), bukan disimpan manual di frontend.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
});

/**
 * Origin server backend TANPA suffix /api/v1 (mis. "http://localhost:4000").
 * Dipakai buat nge-build URL lengkap ke file statis kayak foto profil
 * (avatar_url dari backend cuma path relatif "/uploads/avatars/xxx.jpg" -
 * itu diserve dari ROOT app.js, bukan di bawah /api/v1, lihat app.js
 * backend). Regex strip suffix /api/vN (angka berapa pun) di ujung URL -
 * kalau base URL gak match pola itu (misconfig), fallback ke base URL apa
 * adanya daripada throw.
 */
export const apiOrigin = apiClient.defaults.baseURL.replace(/\/api\/v\d+\/?$/, '');

export default apiClient;
