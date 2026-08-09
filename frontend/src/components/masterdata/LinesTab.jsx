// src/components/masterdata/LinesTab.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { fetchLines } from '../../api/linesApi';
import { useLineMutations } from '../../hooks/useLineMutations';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import Modal from '../Modal';

const emptyForm = { line_name: '', auto_reset_weekly_on_monthly: '' };

function LineFormModal({ initial, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    initial
      ? {
          ...initial,
          auto_reset_weekly_on_monthly:
            initial.auto_reset_weekly_on_monthly === null ? '' : String(initial.auto_reset_weekly_on_monthly),
        }
      : emptyForm
  );
  const [error, setError] = useState('');
  const { create, update } = useLineMutations();
  const pending = create.isPending || update.isPending;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      line_name: form.line_name,
      auto_reset_weekly_on_monthly:
        form.auto_reset_weekly_on_monthly === '' ? null : form.auto_reset_weekly_on_monthly === 'true',
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: initial.id, payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan Line');
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Line' : 'Tambah Line'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label className="form-label">Nama Line</label>
        <input
          className="form-input"
          style={{ width: '100%', marginBottom: 14 }}
          value={form.line_name}
          onChange={(e) => setForm({ ...form, line_name: e.target.value })}
          required
        />

        <label className="form-label">Override Auto-Reset Weekly on Monthly</label>
        <select
          className="form-select"
          style={{ width: '100%', marginBottom: 14 }}
          value={form.auto_reset_weekly_on_monthly}
          onChange={(e) => setForm({ ...form, auto_reset_weekly_on_monthly: e.target.value })}
        >
          <option value="">Ikut Setting Global</option>
          <option value="true">Override: TRUE (selalu ikut reset)</option>
          <option value="false">Override: FALSE (jangan pernah ikut reset)</option>
        </select>

        {error && (
          <div className="error-state" style={{ marginBottom: 12, padding: 8, fontSize: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan'}
        </button>
      </form>
    </Modal>
  );
}

function LinesTab() {
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['lines', { isActive: 'all' }],
    queryFn: () => fetchLines({}),
  });
  const { update, remove } = useLineMutations();
  const confirm = useConfirm();
  const [modalState, setModalState] = useState(null); // null | { mode: 'create' } | { mode: 'edit', line }
  const [deleteError, setDeleteError] = useState('');

  async function handleDelete(line) {
    if (!(await confirm(`Hapus Line "${line.line_name}"?`))) return;
    setDeleteError('');
    try {
      await remove.mutateAsync(line.id);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus Line');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button type="button" className="btn btn-primary" onClick={() => setModalState({ mode: 'create' })}>
          <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Tambah Line
        </button>
      </div>

      {deleteError && (
        <div className="error-state" style={{ marginBottom: 12, padding: 8, fontSize: 12 }}>
          {deleteError}
        </div>
      )}

      {isLoading && <div className="empty-state">Memuat data...</div>}

      {!isLoading && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama Line</th>
              <th>Status</th>
              <th>Auto-Reset Override</th>
              <th style={{ width: 90 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="mono">{line.line_name}</td>
                <td>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={line.is_active}
                      onChange={(e) => update.mutate({ id: line.id, payload: { is_active: e.target.checked } })}
                    />
                    {line.is_active ? 'Aktif' : 'Nonaktif'}
                  </label>
                </td>
                <td className="caption">
                  {line.auto_reset_weekly_on_monthly === null
                    ? 'Ikut Global'
                    : line.auto_reset_weekly_on_monthly
                      ? 'TRUE'
                      : 'FALSE'}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary btn"
                    style={{ padding: 6, marginRight: 4 }}
                    onClick={() => setModalState({ mode: 'edit', line })}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn"
                    style={{ padding: 6 }}
                    onClick={() => handleDelete(line)}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalState && (
        <LineFormModal
          initial={modalState.mode === 'edit' ? modalState.line : null}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}

export default LinesTab;
