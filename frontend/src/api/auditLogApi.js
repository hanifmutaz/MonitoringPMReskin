// src/api/auditLogApi.js
// New (docs/frontend/MIGRATION-PLAN.md Phase 11). Backend endpoint sudah
// lengkap dari awal (routes/auditLogRoutes.js, Admin-only) - cuma frontend
// yang belum pernah consume sama sekali sampai sekarang (lihat
// OPEN-QUESTIONS.md Resolved #2).
import apiClient from './client';

export async function fetchAuditLog(params) {
  const { data } = await apiClient.get('/audit-log', { params });
  return data.data; // { items, total, page, limit }
}
