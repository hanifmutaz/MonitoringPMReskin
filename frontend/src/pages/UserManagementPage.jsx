// src/pages/UserManagementPage.jsx
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useUsers, useUserMutations } from '../hooks/useUsers';
import { useRoles, usePermissionCatalog, useRoleMutations } from '../hooks/useRoles';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import Modal from '../components/Modal';
import ToggleSwitch from '../components/ToggleSwitch';

const emptyForm = { username: '', email: '', password: '', full_name: '', role_id: '' };

function UserFormModal({ initial, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    isEdit
      ? { username: initial.username, email: initial.email || '', full_name: initial.full_name, password: '' }
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
    <Modal title={isEdit ? 'Edit User' : 'Tambah User'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label className="form-label">Username</label>
        <input
          className="form-input"
          style={{ width: '100%', marginBottom: 14 }}
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />
        {errors.username && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.username}</span>}

        <label className="form-label">Full Name</label>
        <input
          className="form-input"
          style={{ width: '100%', marginBottom: 14 }}
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
        />

        <label className="form-label">Email (untuk notifikasi)</label>
        <input
          type="email"
          className="form-input"
          style={{ width: '100%', marginBottom: 14 }}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="opsional, tapi wajib diisi kalau mau terima notifikasi email"
        />
        {errors.email && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.email}</span>}

        <label className="form-label">{isEdit ? 'Password Baru (kosongkan kalau tidak ganti)' : 'Password'}</label>
        <input
          type="password"
          className="form-input"
          style={{ width: '100%', marginBottom: 14 }}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required={!isEdit}
        />
        {errors.password && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.password}</span>}

        {!isEdit && (
          <>
            <label className="form-label">Role</label>
            <select
              className="form-select"
              style={{ width: '100%', marginBottom: 14 }}
              value={form.role_id}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}
              required
            >
              <option value="">Pilih Role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </>
        )}

        {errors._general && (
          <div className="error-state" style={{ marginBottom: 12, padding: 8, fontSize: 12 }}>
            {errors._general}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan'}
        </button>
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
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-header">
        <h2 className="panel-title">
          Menunggu Persetujuan <span className="caption">({pendingUsers.length})</span>
        </h2>
      </div>

      {error && (
        <div className="error-state" style={{ marginBottom: 12, padding: 8, fontSize: 12 }}>
          {error}
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Daftar Sejak</th>
            <th>Assign Role</th>
            <th style={{ width: 160 }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {pendingUsers.map((u) => (
            <tr key={u.id}>
              <td className="mono">{u.username}</td>
              <td>{u.full_name}</td>
              <td className="caption">{u.email || '-'}</td>
              <td className="mono caption">{new Date(u.created_at).toLocaleString('id-ID')}</td>
              <td>
                <select
                  className="form-select"
                  value={roleSelections[u.id] || ''}
                  onChange={(e) => setRoleSelections({ ...roleSelections, [u.id]: e.target.value })}
                >
                  <option value="">Pilih Role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '6px 10px', marginRight: 6, fontSize: 12 }}
                  onClick={() => handleApprove(u)}
                  disabled={approve.isPending}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn-secondary btn"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={() => handleReject(u)}
                  disabled={reject.isPending}
                >
                  Tolak
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-header">
        <h2 className="panel-title">Role & Permission</h2>
      </div>

      {error && (
        <div className="error-state" style={{ marginBottom: 12, padding: 8, fontSize: 12 }}>
          {error}
        </div>
      )}

      {isLoading && <div className="empty-state">Memuat data...</div>}

      {!isLoading && (
        <table className="data-table" style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Nama Role</th>
              <th className="mono">User</th>
              <th>Permission</th>
              <th style={{ width: 140 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>
                  {role.name} {role.is_system && <span className="caption">(bawaan)</span>}
                </td>
                <td className="mono">{role.user_count}</td>
                <td>
                  {expandedRoleId === role.id ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {permissionCatalog.map((p) => (
                        <label key={p.key} className="caption" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={(draftPerms[role.id] || []).includes(p.key)}
                            onChange={() =>
                              togglePerm(p.key, draftPerms[role.id] || [], (v) =>
                                setDraftPerms({ ...draftPerms, [role.id]: v })
                              )
                            }
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  ) : role.name === 'Admin' ? (
                    <span className="caption">Semua akses (superuser)</span>
                  ) : (
                    <span className="caption">
                      {role.permissions.length > 0
                        ? role.permissions
                            .map((k) => permissionCatalog.find((p) => p.key === k)?.label || k)
                            .join(', ')
                        : 'Tidak ada akses khusus'}
                    </span>
                  )}
                </td>
                <td>
                  {role.name === 'Admin' ? (
                    '-'
                  ) : expandedRoleId === role.id ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      onClick={() => saveDraftPermissions(role)}
                      disabled={updatePermissions.isPending}
                    >
                      Simpan
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn-secondary btn"
                        style={{ padding: 6, marginRight: 4 }}
                        onClick={() => startEditPermissions(role)}
                      >
                        <Pencil size={13} />
                      </button>
                      {!role.is_system && (
                        <button
                          type="button"
                          className="btn-secondary btn"
                          style={{ padding: 6 }}
                          onClick={() => handleDelete(role)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleCreate}>
        <div className="caption" style={{ marginBottom: 6 }}>
          Buat role baru
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="mis. Purchasing"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Menyimpan...' : 'Buat Role'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {permissionCatalog.map((p) => (
            <label key={p.key} className="caption" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={newRolePerms.includes(p.key)}
                onChange={() => togglePerm(p.key, newRolePerms, setNewRolePerms)}
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
  usePageHeader({
    title: 'User Management',
  });

  const { data: users = [], isLoading, isError } = useUsers({});
  const { update } = useUserMutations();
  const [modalState, setModalState] = useState(null);

  const nonPendingUsers = users.filter((u) => u.status !== 'PENDING');

  return (
    <div>
      <RoleManagementSection />
      <PendingApprovalSection />

      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Daftar User</h2>
          <button type="button" className="btn btn-primary" onClick={() => setModalState({ mode: 'create' })}>
            <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Tambah User
          </button>
        </div>

        {isError && <div className="error-state">Gagal memuat daftar user.</div>}
        {isLoading && <div className="empty-state">Memuat data...</div>}

        {!isLoading && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Aktif</th>
                <th className="mono">Last Login</th>
                <th style={{ width: 80 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {nonPendingUsers.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.username}</td>
                  <td>{u.full_name}</td>
                  <td className="caption">{u.email || '-'}</td>
                  <td>
                    {u.role || '-'}
                    {u.status === 'REJECTED' && (
                      <span className="caption" style={{ color: 'var(--danger)', marginLeft: 6 }}>
                        (Ditolak)
                      </span>
                    )}
                  </td>
                  <td>
                    <ToggleSwitch
                      checked={u.is_active}
                      onChange={(next) => update.mutate({ id: u.id, payload: { is_active: next } })}
                    />
                  </td>
                  <td className="mono caption">{u.last_login ? new Date(u.last_login).toLocaleString('id-ID') : '-'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary btn"
                      style={{ padding: 6 }}
                      onClick={() => setModalState({ mode: 'edit', user: u })}
                    >
                      <Pencil size={13} />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>

      {modalState && (
        <UserFormModal
          initial={modalState.mode === 'edit' ? modalState.user : null}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}

export default UserManagementPage;
