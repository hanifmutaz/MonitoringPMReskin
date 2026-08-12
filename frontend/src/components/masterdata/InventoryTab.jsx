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
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useUsers, useUserMutations } from '../hooks/useUsers';
import { useRoles, usePermissionCatalog, useRoleMutations } from '../hooks/useRoles';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { useRowSelection } from '../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../hooks/useRecycleBin';
import Modal from '../components/Modal';
import BulkDeleteBar from '../components/BulkDeleteBar';
import ToggleSwitch from '../components/ToggleSwitch';
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

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {['Username', 'Full Name', 'Email', 'Daftar Sejak', 'Assign Role', 'Aksi'].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                  <td className="px-3 py-2.5 font-[var(--font-mono)] text-[13px]">{u.username}</td>
                  <td className="px-3 py-2.5 text-[13px]">{u.full_name}</td>
                  <td className="px-3 py-2.5 text-xs text-[var(--text-dim)]">{u.email || '-'}</td>
                  <td className="px-3 py-2.5 font-[var(--font-mono)] text-xs text-[var(--text-dim)]">
                    {new Date(u.created_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2.5">
                    <Select
                      value={roleSelections[u.id] || ''}
                      onValueChange={(v) => setRoleSelections({ ...roleSelections, [u.id]: v })}
                    >
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
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5">
                      <Button type="button" size="sm" onClick={() => handleApprove(u)} disabled={approve.isPending}>
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(u)}
                        disabled={reject.isPending}
                      >
                        Tolak
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
  const selectableIds = roles.filter((r) => !r.is_system).map((r) => r.id);
  const selection = useRowSelection(selectableIds);
  const bulkDelete = useBulkDeleteMutation('roles');
  const [bulkError, setBulkError] = useState('');

  function togglePerm(key, currentList, setter) {
    setter(currentList.includes(key) ? currentList.filter((k) => k !== key) : [...currentList, key]);
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

      {isLoading && <div className="py-6 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>}

      {!isLoading && (
        <div className="mb-4 overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-[36px] px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selection.allOnPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = selection.someOnPageSelected && !selection.allOnPageSelected;
                      }}
                      onChange={selection.toggleAllOnPage}
                      className="h-3.5 w-3.5 accent-[var(--accent)]"
                    />
                  </th>
                  {['Nama Role', 'User', 'Permission', 'Aksi'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                    <td className="px-3 py-2.5">
                      {!role.is_system && (
                        <input
                          type="checkbox"
                          checked={selection.isSelected(role.id)}
                          onChange={() => selection.toggle(role.id)}
                          className="h-3.5 w-3.5 accent-[var(--accent)]"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[13px]">
                      {role.name}{' '}
                      {role.is_system && <span className="text-xs text-muted-foreground">(bawaan)</span>}
                    </td>
                    <td className="px-3 py-2.5 font-[var(--font-mono)] text-[13px]">{role.user_count}</td>
                    <td className="px-3 py-2.5">
                      {expandedRoleId === role.id ? (
                        <div className="flex flex-wrap gap-2">
                          {permissionCatalog.map((p) => (
                            <label key={p.key} className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={(draftPerms[role.id] || []).includes(p.key)}
                                onChange={() =>
                                  togglePerm(p.key, draftPerms[role.id] || [], (v) =>
                                    setDraftPerms({ ...draftPerms, [role.id]: v })
                                  )
                                }
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
                            ? role.permissions
                                .map((k) => permissionCatalog.find((p) => p.key === k)?.label || k)
                                .join(', ')
                            : 'Tidak ada akses khusus'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {role.name === 'Admin' ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : expandedRoleId === role.id ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => saveDraftPermissions(role)}
                          disabled={updatePermissions.isPending}
                        >
                          Simpan
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditPermissions(role)}
                          >
                            <Pencil size={13} />
                          </Button>
                          {!role.is_system && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDelete(role)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                onChange={() => togglePerm(p.key, newRolePerms, setNewRolePerms)}
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

  const { data: users = [], isLoading, isError } = useUsers({});
  const { update } = useUserMutations();
  const [modalState, setModalState] = useState(null);

  const nonPendingUsers = users.filter((u) => u.status !== 'PENDING');

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

        {isError && (
          <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
            Gagal memuat daftar user.
          </div>
        )}
        {isLoading && <div className="py-8 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>}

        {!isLoading && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {['Username', 'Full Name', 'Email', 'Role', 'Aktif', 'Last Login', 'Aksi'].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nonPendingUsers.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                      <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{u.username}</td>
                      <td className="px-3 py-3 text-[13px]">{u.full_name}</td>
                      <td className="px-3 py-3 text-xs text-[var(--text-dim)]">{u.email || '-'}</td>
                      <td className="px-3 py-3 text-[13px]">
                        {u.role || '-'}
                        {u.status === 'REJECTED' && (
                          <span className="ml-1.5 text-xs text-[var(--danger)]">(Ditolak)</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <ToggleSwitch
                          checked={u.is_active}
                          onChange={(next) => update.mutate({ id: u.id, payload: { is_active: next } })}
                        />
                      </td>
                      <td className="px-3 py-3 font-[var(--font-mono)] text-xs text-[var(--text-dim)]">
                        {u.last_login ? new Date(u.last_login).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setModalState({ mode: 'edit', user: u })}
                        >
                          <Pencil size={13} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalState && (
        <UserFormModal initial={modalState.mode === 'edit' ? modalState.user : null} onClose={() => setModalState(null)} />
      )}
    </div>
  );
}

export default UserManagementPage;