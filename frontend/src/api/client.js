// src/api/client.js
import axios from 'axios';

// withCredentials WAJIB true - JWT disimpan httpOnly cookie (keputusan
// 06_ENVIRONMENT_AND_BOOTSTRAP.md §3), bukan disimpan manual di frontend.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
});

export default apiClient;
