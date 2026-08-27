// src/pages/UserManagementPage.jsx
// Reskin (checklist §3 item 5 "admin pages", batch terakhir): `.panel`/
// `.panel-header`/`.panel-title`/`.data-table`/`.form-input`/`.form-select`/
// `.form-label`/`.btn`/`.btn-primary`/`.btn-secondary`/`.error-state`/
// `.empty-state`/`.caption`/inline style lama dilepas TOTAL, diganti
// Tailwind + shadcn ui murni, ngikutin pola yang udah dipakai di Master
// Data (PartsTab dkk) & Dashboard (rounded-lg border-border bg-card p-4.5).
// `ToggleSwitch.jsx` SENGAJA TIDAK diikutkan reskin ini - dia komponen
// shared yang juga dipakai SettingsPage.jsx (di luar cakupan Master
// Data/PM/admin pages), dan secara fungsional udah aman (ada cursor
// pointer/not-allowed inline eksplisit), jadi bukan prioritas.
// Data/logic (hook, mutation, permission checkbox, approve/reject flow)
// TIDAK berubah sama sekali.
//
// DataTable migration (docs/frontend/MIGRATION-PLAN.md Phase 11): SEMUA
// TIGA hand-rolled <table> di file ini diganti data-display/DataTable.
// Kolom untuk ketiganya pindah ke userManagementColumns.jsx (co-located di
// pages/, satu file - sama alasan pmLineHistoryColumns.jsx/
// inventoryHistoryColumns.jsx, single-page consumer, gak ada domain folder
// yang pas). PendingApprovalSection: tanpa selection (approve/reject
// per-baris, bukan bulk action). Main "Daftar User" table & RoleManagement-
// Section: DUA-duanya butuh `selection.isSelectable` yang BARU ditambahin
// ke useRowSelection/DataTable Phase 11 ini - sebelumnya checkbox baris
// tertentu (baris User sendiri yang lagi login; Role bawaan/is_system)
// disembunyikan dengan `{kondisi && <input.../>}` inline di hand-rolled
// table. DataTable TIDAK punya cara buat itu sebelum penambahan
// `isSelectable` (lihat komentar di DataTable.jsx/useRowSelection.js) -
// jadi ini BUKAN migrasi mekanis murni presentational, ada 1 capability
// baru yang genuinely dibutuhkan lebih dulu. Semua state/query/mutation/
// permission-edit-flow TIDAK berubah.
import { useState } from 'react';
import { Plus, Inbox } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useUsers, useUserMutations } from '../hooks/useUsers';
import { useRoles, usePermissionCatalog, useRoleMutations } from '../hooks/useRoles';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { useAuth } from '../contexts/AuthContext';
import { useRowSelection } from '../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../hooks/useRecycleBin';
import { buildPendingApprovalColumns, buildUserColumns, buildRoleColumns } from './userManagementColumns';
import Modal from '../components/Modal';
import BulkDeleteBar from '../components/BulkDeleteBar';
import { DataTable } from '../components/data-display/DataTable';
import { EmptyState } from '../components/ui/empty-state';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const emptyForm = { username: '', email: '', password: '', full_name: '', role_id: '' };

function UserFormModal({ initial, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    isEdit
      ? { username: initial.username, email: initial.email || '', full_name: initial.full_name, password: '', role_id: '' }
      : emptyForm
  );
  const [errors, setErrors] = useState({});
  const { create, update } = useUserMutations();
  const { data: roles = [] } = useRoles();
  const pending = create.isPending || update.isPending;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    try {
      if (isEdit) {
        const payload = { username: form.username, email: form.email || null, full_name: form.full_name };
        if (form.password) payload.password = form.password;
        await update.mutateAsync({ id: initial.id, payload });
      } else {
        await create.mutateAsync({
          username: form.username,
          email: form.email || undefined,
          password: form.password,
          full_name: form.full_name,
          role_id: Number(form.role_id),
        });
      }
      onClose();
    } catch (err) {
      setErrors(err.response?.data?.errors || { _general: err.response?.data?.message || 'Gagal menyimpan user' });
    }
  }

  return (
    <Modal title={isEdit ? 'Edit User' : 'Tambah User'} onClose={onClose} width={480}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <Label className="mb-1.5">Username</Label>
          <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          {errors.username && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.username}</p>}
        </div>

        <div>
          <Label className="mb-1.5">Full Name</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        </div>

        <div>
          <Label className="mb-1.5">Email (untuk notifikasi)</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="opsional, tapi wajib diisi kalau mau terima notifikasi email"
          />
          {errors.email && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.email}</p>}
        </div>

        <div>
          <Label className="mb-1.5">{isEdit ? 'Password Baru (kosongkan kalau tidak ganti)' : 'Password'}</Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!isEdit}
          />
          {errors.password && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.password}</p>}
        </div>

        {!isEdit && (
          <div>
            <Label className="mb-1.5">Role</Label>
            <Select value={form.role_id} onValueChange={(v) => setForm({ ...form, role_id: v })}>
              <SelectTrigger>
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
          </div>
        )}

        {errors._general && (
          <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
            {errors._general}
          </div>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </form>
    </Modal>
  );
}

function PendingApprovalSection() {
  const { data: pendingUsers = [], isLoading } = useUsers({ status: 'PENDING' });
  const { approve, reject } = useUserMutations();
  const { data: roles = [] } = useRoles();
  const confirm = useConfirm();
  const [roleSelections, setRoleSelections] = useState({});
  const [error, setError] = useState('');

  async function handleApprove(user) {
    const roleId = Number(roleSelections[user.id]);
    if (!roleId) {
      setError(`Pilih role dulu untuk ${user.username} sebelum approve`);
      return;
    }
    setError('');
    try {
      await approve.mutateAsync({ id: user.id, roleId });
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal approve user');
    }
  }

  async function handleReject(user) {
    if (!(await confirm(`Tolak pendaftaran "${user.username}"?`))) return;
    setError('');
    try {
      await reject.mutateAsync(user.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal reject user');
    }
  }

  if (isLoading) return null;
  if (pendingUsers.length === 0) return null;

  const columns = buildPendingApprovalColumns({
    roles,
    roleSelections,
    onRoleSelect: (userId, roleId) => setRoleSelections({ ...roleSelections, [userId]: roleId }),
    onApprove: handleApprove,
    onReject: handleReject,
    approvePending: approve.isPending,
    rejectPending: reject.isPending,
  });

  return (
    <div className="mb-4 rounded-lg border border-border bg-card p-4.5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">
          Menunggu Persetujuan{' '}
          <span className="text-xs font-normal text-muted-foreground">({pendingUsers.length})</span>
        </h2>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{error}</div>
      )}

      <DataTable columns={columns} rows={pendingUsers} getRowKey={(u) => u.id} />
    </div>
  );
}

function RoleManagementSection() {
  const { data: roles = [], isLoading } = useRoles();
  const { data: permissionCatalog = [] } = usePermissionCatalog();
  const { create, updatePermissions, remove } = useRoleMutations();
  const confirm = useConfirm();
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePerms, setNewRolePerms] = useState([]);
  const [error, setError] = useState('');
  const [expandedRoleId, setExpandedRoleId] = useState(null);
  const [draftPerms, setDraftPerms] = useState({});
  // Role bawaan (is_system) gak bisa di-checklist/dihapus - sama seperti
  // tombol Trash2 per-baris yang juga disembunyikan buat role.is_system.
  // Dulu ini cuma bergantung pada checkbox yang gak di-render di hand-
  // rolled table; sekarang selection.isSelectable (Phase 11 - lihat
  // komentar di useRowSelection.js) yang menegakkan itu di DataTable.
  const selectableIds = roles.filter((r) => !r.is_system).map((r) => r.id);
  const selection = useRowSelection(selectableIds);
  const bulkDelete = useBulkDeleteMutation('roles');
  const [bulkError, setBulkError] = useState('');

  function togglePerm(roleId, key) {
    setDraftPerms((prev) => {
      const current = prev[roleId] || [];
      return { ...prev, [roleId]: current.includes(key) ? current.filter((k) => k !== key) : [...current, key] };
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!newRoleName.trim()) return;
    try {
      await create.mutateAsync({ name: newRoleName.trim(), permissions: newRolePerms });
      setNewRoleName('');
      setNewRolePerms([]);
    } catch (err) {
      setError(err.response?.data?.errors?.name || err.response?.data?.message || 'Gagal membuat role');
    }
  }

  function startEditPermissions(role) {
    setExpandedRoleId(role.id);
    setDraftPerms({ ...draftPerms, [role.id]: role.permissions.includes('*') ? [] : [...role.permissions] });
  }

  async function saveDraftPermissions(role) {
    setError('');
    try {
      await updatePermissions.mutateAsync({ id: role.id, permissions: draftPerms[role.id] || [] });
      setExpandedRoleId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal simpan permission');
    }
  }

  async function handleDelete(role) {
    if (!(await confirm(`Hapus role "${role.name}"? Role ini harus tidak dipakai user manapun.`))) return;
    setError('');
    try {
      await remove.mutateAsync(role.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus role');
    }
  }

  async function handleBulkDelete() {
    if (!(await confirm(`Hapus ${selection.selectedCount} Role terpilih? Bisa direstore lewat Recycle Bin.`)))
      return;
    setBulkError('');
    try {
      await bulkDelete.mutateAsync(selection.selectedIds);
      selection.clear();
    } catch (err) {
      setBulkError(err.response?.data?.message || 'Gagal menghapus Role terpilih');
    }
  }

  function togglePermForNew(key) {
    setNewRolePerms((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const columns = buildRoleColumns({
    permissionCatalog,
    expandedRoleId,
    draftPerms,
    onTogglePerm: togglePerm,
    onStartEdit: startEditPermissions,
    onSavePerms: saveDraftPermissions,
    onDelete: handleDelete,
    savePending: updatePermissions.isPending,
  });

  return (
    <div className="mb-4 rounded-lg border border-border bg-card p-4.5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">Role & Permission</h2>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{error}</div>
      )}

      {bulkError && (
        <div className="mb-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
          {bulkError}
        </div>
      )}

      <BulkDeleteBar
        count={selection.selectedCount}
        onDelete={handleBulkDelete}
        onClear={selection.clear}
        pending={bulkDelete.isPending}
        label="Role"
      />

      <div className="mb-4">
        <DataTable columns={columns} rows={roles} getRowKey={(role) => role.id} isLoading={isLoading} selection={selection} />
      </div>

      <form onSubmit={handleCreate}>
        <div className="mb-1.5 text-xs text-muted-foreground">Buat role baru</div>
        <div className="mb-2 flex gap-2">
          <Input
            className="flex-1"
            placeholder="mis. Purchasing"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
          />
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Menyimpan...' : 'Buat Role'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissionCatalog.map((p) => (
            <label key={p.key} className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={newRolePerms.includes(p.key)}
                onChange={() => togglePermForNew(p.key)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              {p.label}
            </label>
          ))}
        </div>
      </form>
    </div>
  );
}

function UserManagementPage() {
  usePageHeader({ title: 'User Management' });

  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading, isError } = useUsers({});
  const { update } = useUserMutations();
  const [modalState, setModalState] = useState(null);
  const confirm = useConfirm();
  const [bulkError, setBulkError] = useState('');

  const nonPendingUsers = users.filter((u) => u.status !== 'PENDING');
  // Akun sendiri gak boleh ke-checklist buat bulk delete - sengaja dijegal
  // di frontend (bukan di backend) karena bulk-delete Recycle Bin sifatnya
  // generic power-tool buat Admin testing (lihat catatan di
  // recycleBinService.js), jadi satu-satunya jaring pengaman praktis di
  // sini adalah gak nawarin checkbox-nya sama sekali buat baris diri
  // sendiri. Kalau kehapus akun lain yang lagi login, sesinya otomatis
  // ke-invalidate di request berikutnya (findUserById filter deleted_at).
  // DataTable/useRowSelection sekarang menegakkan "gak nawarin checkbox"
  // itu via selection.isSelectable (Phase 11) - selectableIds di bawah
  // TETAP jadi satu-satunya sumber kebenaran soal siapa yang selectable.
  const selectableIds = nonPendingUsers.filter((u) => u.id !== currentUser?.id).map((u) => u.id);
  const selection = useRowSelection(selectableIds);
  const bulkDelete = useBulkDeleteMutation('users');

  async function handleBulkDelete() {
    if (
      !(await confirm(
        `Hapus ${selection.selectedCount} User terpilih? Sesi mereka yang lagi login otomatis ke-invalidate. Bisa direstore lewat Recycle Bin.`
      ))
    )
      return;
    setBulkError('');
    try {
      await bulkDelete.mutateAsync(selection.selectedIds);
      selection.clear();
    } catch (err) {
      setBulkError(err.response?.data?.message || 'Gagal menghapus User terpilih');
    }
  }

  const columns = buildUserColumns({
    currentUser,
    onEdit: (u) => setModalState({ mode: 'edit', user: u }),
    onToggleActive: (id, next) => update.mutate({ id, payload: { is_active: next } }),
  });

  return (
    <div>
      <RoleManagementSection />
      <PendingApprovalSection />

      <div className="rounded-lg border border-border bg-card p-4.5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">Daftar User</h2>
          <Button type="button" onClick={() => setModalState({ mode: 'create' })}>
            <Plus size={14} /> Tambah User
          </Button>
        </div>

        {bulkError && (
          <div className="mb-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
            {bulkError}
          </div>
        )}

        <BulkDeleteBar
          count={selection.selectedCount}
          onDelete={handleBulkDelete}
          onClear={selection.clear}
          pending={bulkDelete.isPending}
          label="User"
        />

        <DataTable
          columns={columns}
          rows={nonPendingUsers}
          getRowKey={(u) => u.id}
          isLoading={isLoading}
          isError={isError}
          selection={selection}
          emptyState={<EmptyState icon={Inbox} title="Belum ada User" />}
        />
      </div>

      {modalState && (
        <UserFormModal initial={modalState.mode === 'edit' ? modalState.user : null} onClose={() => setModalState(null)} />
      )}
    </div>
  );
}

export default UserManagementPage;
