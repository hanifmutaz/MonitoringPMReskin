// src/components/masterdata/ClMappingModal.jsx
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useClMapping, useClMappingMutations } from '../../hooks/useClMapping';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import Modal from '../Modal';

const emptyForm = { cl_no: '', product_name: '', jig_name: '' };

function ClMappingModal({ part, onClose }) {
  const { data: mappings = [], isLoading } = useClMapping(part.id);
  const { create, remove } = useClMappingMutations(part.id);
  const confirm = useConfirm();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await create.mutateAsync(form);
      setForm(emptyForm);
    } catch (err) {
      setError(err.response?.data?.errors?.cl_no || err.response?.data?.message || 'Gagal menambah mapping');
    }
  }

  async function handleRemove(id) {
    if (!(await confirm('Hapus mapping ini?'))) return;
    await remove.mutateAsync(id);
  }

  return (
    <Modal title={`CL Mapping — ${part.drawing_no} (${part.jig_name})`} onClose={onClose} width={520}>
      {isLoading ? (
        <div className="empty-state">Memuat data...</div>
      ) : (
        <table className="data-table" style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th>CL No</th>
              <th>Product</th>
              <th>Jig</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {mappings.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  Belum ada CL No terpetakan.
                </td>
              </tr>
            )}
            {mappings.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.cl_no}</td>
                <td>{m.product_name || '-'}</td>
                <td>{m.jig_name || '-'}</td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary btn"
                    style={{ padding: 4 }}
                    onClick={() => handleRemove(m.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">CL No</label>
          <input
            className="form-input"
            value={form.cl_no}
            onChange={(e) => setForm({ ...form, cl_no: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="form-label">Product</label>
          <input
            className="form-input"
            value={form.product_name}
            onChange={(e) => setForm({ ...form, product_name: e.target.value })}
          />
        </div>
        <div>
          <label className="form-label">Jig</label>
          <input
            className="form-input"
            value={form.jig_name}
            onChange={(e) => setForm({ ...form, jig_name: e.target.value })}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={create.isPending}>
          <Plus size={14} style={{ verticalAlign: -2 }} />
        </button>
      </form>
      {error && (
        <div className="error-state" style={{ marginTop: 10, padding: 8, fontSize: 12 }}>
          {error}
        </div>
      )}
    </Modal>
  );
}

export default ClMappingModal;
