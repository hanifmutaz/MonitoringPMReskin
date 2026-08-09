// src/components/masterdata/SuppliersTab.jsx
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useSupplierMutations } from '../../hooks/useSupplierMutations';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import Modal from '../Modal';

const emptyForm = { supplier_name: '', contact_person: '', phone: '', email: '', address: '', notes: '' };

function SupplierFormModal({ initial, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    initial
      ? {
          supplier_name: initial.supplier_name,
          contact_person: initial.contact_person || '',
          phone: initial.phone || '',
          email: initial.email || '',
          address: initial.address || '',
          notes: initial.notes || '',
        }
      : emptyForm
  );
  const [errors, setErrors] = useState({});
  const { create, update } = useSupplierMutations();
  const pending = create.isPending || update.isPending;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    const payload = {
      supplier_name: form.supplier_name,
      contact_person: form.contact_person || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: initial.id, payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setErrors(err.response?.data?.errors || { _general: err.response?.data?.message || 'Gagal menyimpan Supplier' });
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Supplier' : 'Tambah Supplier'} onClose={onClose} width={480}>
      <form onSubmit={handleSubmit}>
        <label className="form-label">Nama Supplier</label>
        <input
          className="form-input"
          style={{ width: '100%', marginBottom: 14 }}
          value={form.supplier_name}
          onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
          required
        />
        {errors.supplier_name && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.supplier_name}</span>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label className="form-label">Kontak Person</label>
            <input
              className="form-input"
              style={{ width: '100%' }}
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Telepon</label>
            <input
              className="form-input mono"
              style={{ width: '100%' }}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              style={{ width: '100%' }}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Alamat</label>
            <textarea
              className="form-input"
              style={{ width: '100%', minHeight: 50 }}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Catatan</label>
            <textarea
              className="form-input"
              style={{ width: '100%', minHeight: 50 }}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

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

function SuppliersTab() {
  const { data: suppliers = [], isLoading } = useSuppliers({ isActive: undefined });
  const { update, remove } = useSupplierMutations();
  const confirm = useConfirm();
  const [modalState, setModalState] = useState(null); // null | { mode: 'create' } | { mode: 'edit', supplier }
  const [deleteError, setDeleteError] = useState('');

  async function handleDelete(supplier) {
    if (!(await confirm(`Hapus Supplier "${supplier.supplier_name}"?`))) return;
    setDeleteError('');
    try {
      await remove.mutateAsync(supplier.id);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus Supplier');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button type="button" className="btn btn-primary" onClick={() => setModalState({ mode: 'create' })}>
          <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Tambah Supplier
        </button>
      </div>

      {deleteError && (
        <div className="error-state" style={{ marginBottom: 12, padding: 8, fontSize: 12 }}>
          {deleteError}
        </div>
      )}

      {isLoading && <div className="empty-state">Memuat data...</div>}
      {!isLoading && suppliers.length === 0 && <div className="empty-state">Belum ada Supplier.</div>}

      {!isLoading && suppliers.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nama Supplier</th>
              <th>Kontak</th>
              <th>Telepon</th>
              <th>Email</th>
              <th>Status</th>
              <th style={{ width: 90 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className="mono">{s.supplier_name}</td>
                <td className="caption">{s.contact_person || '-'}</td>
                <td className="mono">{s.phone || '-'}</td>
                <td className="caption">{s.email || '-'}</td>
                <td>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={s.is_active}
                      onChange={(e) => update.mutate({ id: s.id, payload: { is_active: e.target.checked } })}
                    />
                    {s.is_active ? 'Aktif' : 'Nonaktif'}
                  </label>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary btn"
                    style={{ padding: 6, marginRight: 4 }}
                    onClick={() => setModalState({ mode: 'edit', supplier: s })}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn"
                    style={{ padding: 6 }}
                    onClick={() => handleDelete(s)}
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
        <SupplierFormModal
          initial={modalState.mode === 'edit' ? modalState.supplier : null}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}

export default SuppliersTab;
