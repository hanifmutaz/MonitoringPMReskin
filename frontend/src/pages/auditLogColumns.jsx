// src/pages/auditLogColumns.jsx
// New (docs/frontend/MIGRATION-PLAN.md Phase 11 - Audit Log built new, per
// OPEN-QUESTIONS.md Resolved #2). 6 columns: Waktu, Tabel, Aksi, Detail
// (action_detail human-readable summary, backend gap fixed alongside this
// - see auditLogQueries.js comment), Oleh, dan tombol buka modal diff
// old_value/new_value mentah (JSONB) - action_detail cukup buat kebanyakan
// kasus, tapi diff mentah tetap disediakan buat audit forensik yang
// beneran butuh lihat before/after utuh (bukan cuma ringkasan).
import { Eye } from 'lucide-react';
import { Button } from '../components/ui/button';

const ACTION_BADGE_CLASS = {
  CREATE: 'bg-ok-dim text-ok',
  UPDATE: 'bg-warn-dim text-warn',
  DELETE: 'bg-danger-dim text-danger',
};

const TABLE_NAME_LABEL = {
  app_settings: 'Settings',
  inventory_items: 'Inventory Item',
  inventory_stock_movements: 'Mutasi Stok',
  lines: 'Line',
  part_cl_mapping: 'CL Mapping',
  part_suppliers: 'Part-Supplier Link',
  parts: 'Part',
  pm_monthly_history: 'PM Monthly History',
  pm_part_history: 'PM Part History',
  role_permissions: 'Role Permission',
  roles: 'Role',
  suppliers: 'Supplier',
  users: 'User',
};

function buildAuditLogColumns({ onViewDiff }) {
  return [
    {
      key: 'created_at',
      header: 'Waktu',
      className: 'font-[var(--font-mono)] text-xs text-[var(--text-dim)]',
      render: (a) => new Date(a.created_at).toLocaleString('id-ID'),
    },
    {
      key: 'table_name',
      header: 'Tabel',
      render: (a) => (
        <>
          <span className="text-[13px]">{TABLE_NAME_LABEL[a.table_name] || a.table_name}</span>
          {a.record_id && <span className="ml-1 font-[var(--font-mono)] text-xs text-[var(--text-faint)]">#{a.record_id}</span>}
        </>
      ),
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (a) => (
        <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${ACTION_BADGE_CLASS[a.action] || 'bg-[var(--panel-3)] text-[var(--text-faint)]'}`}>
          {a.action}
        </span>
      ),
    },
    {
      key: 'action_detail',
      header: 'Detail',
      className: 'max-w-[320px] text-xs text-[var(--text-dim)]',
      render: (a) => a.action_detail || '-',
    },
    {
      key: 'user',
      header: 'Oleh',
      className: 'text-xs text-[var(--text-dim)]',
      render: (a) => a.user_full_name || a.user_username || '-',
    },
    {
      key: 'diff',
      header: '',
      srHeader: 'Lihat Detail Perubahan',
      render: (a) =>
        (a.old_value || a.new_value) && (
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" title="Lihat detail perubahan" onClick={() => onViewDiff(a)}>
            <Eye size={13} />
          </Button>
        ),
    },
  ];
}

export { TABLE_NAME_LABEL };
export default buildAuditLogColumns;
