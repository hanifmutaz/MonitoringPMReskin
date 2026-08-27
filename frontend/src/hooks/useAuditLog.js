// src/hooks/useAuditLog.js
// New (docs/frontend/MIGRATION-PLAN.md Phase 11).
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLog } from '../api/auditLogApi';

export function useAuditLog(params) {
  return useQuery({ queryKey: ['audit-log', params], queryFn: () => fetchAuditLog(params) });
}
