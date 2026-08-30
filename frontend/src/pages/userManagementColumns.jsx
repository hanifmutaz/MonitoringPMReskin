// src/pages/userManagementColumns.jsx
// New (docs/frontend/MIGRATION-PLAN.md Phase 11). Extracted from the three
// hand-rolled <table>s in UserManagementPage.jsx (PendingApprovalSection,
// the main "Daftar User" table, RoleManagementSection) - one file since
// all three are single-page-scoped, no cross-page reuse case (same
// reasoning as pmLineHistoryColumns.jsx/inventoryHistoryColumns.jsx being
// co-located in pages/ rather than a domain folder).
//
// buildRoleColumns' Permission cell is the most complex render function in
// the app so far - it closes over expandedRoleId/draftPerms (per-row
// expand-to-edit state) same as any other column render function closing
// over page state, nothing new architecturally, just more local state
// than usual.
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import ToggleSwitch from '../components/ToggleSwitch';

function buildPendingApprovalColumns({ roles, roleSelections, onRoleSelect, onApprove, onReject, approvePending, rejectPending }) {
  return [
    { key: 'username', header: 'Username', className: 'font-[var(--font-mono)] text-[13px]', render: (u) => u.username },
    { key: 'full_name', header: 'Full Name', render: (u) => u.full_name },
    { key: 'email', header: 'Email', className: 'text-xs text-[var(--text-dim)]', render: (u) => u.email || '-' },
    {
      key: 'created_at',
      header: 'Daftar Sejak',
      className: 'font-[var(--font-mono)] text-xs text-[var(--text-dim)]',
      render: (u) => new Date(u.created_at).toLocaleString('id-ID'),
    },
    {
      key: 'role',
      header: 'Assign Role',
      render: (u) => (
        <Select value={roleSelections[u.id] || ''} onValueChange={(v) => onRoleSelect(u.id, v)}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Pilih Role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (u) => (
        <div className="flex gap-1.5">
          <Button type="button" size="sm" onClick={() => onApprove(u)} disabled={approvePending}>
            Approve
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onReject(u)} disabled={rejectPending}>
            Tolak
          </Button>
        </div>
      ),
    },
  ];
}

function buildUserColumns({ currentUser, onEdit, onToggleActive }) {
  return [
    {
      key: 'username',
      header: 'Username',
      render: (u) => (
        <span className="font-[var(--font-mono)] text-[13px]">
          {u.username} {u.id === currentUser?.id && <span className="text-xs text-muted-foreground">(kamu)</span>}
        </span>
      ),
    },
    { key: 'full_name', header: 'Full Name', render: (u) => u.full_name },
    { key: 'email', header: 'Email', className: 'text-xs text-[var(--text-dim)]', render: (u) => u.email || '-' },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <>
          {u.role || '-'}
          {u.status === 'REJECTED' && <span className="ml-1.5 text-xs text-[var(--danger)]">(Ditolak)</span>}
        </>
      ),
    },
    {
      key: 'is_active',
      header: 'Aktif',
      // ToggleSwitch diimport langsung di sini (bukan lewat prop runtime -
      // col.render cuma nerima 1 argumen: row). Komponennya sendiri
      // SENGAJA gak ikut direskin (lihat komentar asli UserManagementPage.jsx
      // - shared, juga dipakai SettingsPage.jsx, di luar cakupan ini) -
      // tapi tetap boleh diimport & dipakai apa adanya di sini.
      render: (u) => (
        <ToggleSwitch checked={u.is_active} onChange={(next) => onToggleActive(u.id, next)} label={`${u.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${u.username}`} />
      ),
    },
    {
      key: 'last_login',
      header: 'Last Login',
      className: 'font-[var(--font-mono)] text-xs text-[var(--text-dim)]',
      render: (u) => (u.last_login ? new Date(u.last_login).toLocaleString('id-ID') : '-'),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (u) => (
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onEdit(u)} aria-label={`Edit ${u.username}`}>
          <Pencil size={13} />
        </Button>
      ),
    },
  ];
}

function buildRoleColumns({
  permissionCatalog,
  expandedRoleId,
  draftPerms,
  onTogglePerm,
  onStartEdit,
  onSavePerms,
  onDelete,
  savePending,
}) {
  return [
    {
      key: 'name',
      header: 'Nama Role',
      render: (role) => (
        <>
          {role.name} {role.is_system && <span className="text-xs text-muted-foreground">(bawaan)</span>}
        </>
      ),
    },
    { key: 'user_count', header: 'User', className: 'font-[var(--font-mono)] text-[13px]', render: (role) => role.user_count },
    {
      key: 'permissions',
      header: 'Permission',
      render: (role) =>
        expandedRoleId === role.id ? (
          <div className="flex flex-wrap gap-2">
            {permissionCatalog.map((p) => (
              <label key={p.key} className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={(draftPerms[role.id] || []).includes(p.key)}
                  onChange={() => onTogglePerm(role.id, p.key)}
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                {p.label}
              </label>
            ))}
          </div>
        ) : role.name === 'Admin' ? (
          <span className="text-xs text-muted-foreground">Semua akses (superuser)</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {role.permissions.length > 0
              ? role.permissions.map((k) => permissionCatalog.find((p) => p.key === k)?.label || k).join(', ')
              : 'Tidak ada akses khusus'}
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (role) =>
        role.name === 'Admin' ? (
          <span className="text-xs text-muted-foreground">-</span>
        ) : expandedRoleId === role.id ? (
          <Button type="button" size="sm" onClick={() => onSavePerms(role)} disabled={savePending}>
            Simpan
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onStartEdit(role)} aria-label={`Edit permission ${role.name}`}>
              <Pencil size={13} />
            </Button>
            {!role.is_system && (
              <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onDelete(role)} aria-label={`Hapus role ${role.name}`}>
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        ),
    },
  ];
}

export { buildPendingApprovalColumns, buildUserColumns, buildRoleColumns };
