// src/components/masterdata/PartSupplierModal.jsx
import { useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { usePartSuppliers, usePartSupplierMutations } from '../../hooks/usePartSuppliers';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import Modal from '../Modal';

const emptyForm = { supplier_id: '', notes: '' };

function PartSupplierModal({ part, onClose }) {
  const { data: links = [], isLoading } = usePartSuppliers(part.id);
  const { data: allSuppliers = [] } = useSuppliers({ isActive: true });
  const { create, setPrimary, remove } = usePartSupplierMutations(part.id);
  const confirm = useConfirm();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  // Supplier yang udah terhubung ke Part ini gak muncul lagi di dropdown -
  // constraint uq_part_suppliers (1 part + 1 supplier cuma boleh 1 baris)
  // udah dijamin di DB, ini cuma biar operator gak nemu error pas submit.
  const linkedSupplierIds = new Set(links.map((l) => l.supplier_id));
  const availableSuppliers = allSuppliers.filter((s) => !linkedSupplierIds.has(s.id));

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await create.mutateAsync({ supplier_id: Number(form.supplier_id), notes: form.notes || undefined });
      setForm(emptyForm);
    } catch (err) {
      setError(err.response?.data?.errors?.supplier_id || err.response?.data?.message || 'Gagal menambah Supplier');
    }
  }

  async function handleRemove(id) {
    if (!(await confirm('Lepas Supplier ini dari Part?'))) return;
    await remove.mutateAsync(id);
  }

  function handleTogglePrimary(link) {
    // Klik bintang yang UDAH utama -> lepas status utama. Klik yang belum
    // utama -> jadi utama (yang lama otomatis ke-unset, lihat
    // partSupplierService.setPrimary di backend).
    setPrimary.mutate({ id: link.id, isPrimary: !link.is_primary });
  }

  return (
    <Modal title={`Supplier — ${part.drawing_no} (${part.jig_name})`} onClose={onClose} width={560}>
      <div className="caption" style={{ marginBottom: 10 }}>
        Bintang menandai Supplier <strong>utama</strong> (biasa dipesen ke situ duluan) — klik bintang buat
        pindah/lepas status utama.
      </div>

      {isLoading ? (
        <div className="empty-state">Memuat data...</div>
      ) : (
        <table className="data-table" style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Supplier</th>
              <th>Kontak</th>
              <th>Catatan</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  Belum ada Supplier terhubung ke Part ini.
                </td>
              </tr>
            )}
            {links.map((l) => (
              <tr key={l.id}>
                <td>
                  <button
                    type="button"
                    className="btn-secondary btn"
                    style={{ padding: 4, color: l.is_primary ? 'var(--warn)' : undefined }}
                    title={l.is_primary ? 'Supplier utama - klik buat lepas' : 'Jadikan Supplier utama'}
                    onClick={() => handleTogglePrimary(l)}
                    disabled={setPrimary.isPending}
                  >
                    <Star size={13} fill={l.is_primary ? 'currentColor' : 'none'} />
                  </button>
                </td>
                <td className="mono">
                  {l.supplier_name}
                  {!l.supplier_is_active && (
                    <span className="caption" style={{ display: 'block', color: 'var(--text-faint)' }}>
                      (nonaktif)
                    </span>
                  )}
                </td>
                <td className="caption">
                  {l.contact_person || '-'}
                  {l.phone && <div className="mono">{l.phone}</div>}
                </td>
                <td className="caption">{l.notes || '-'}</td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary btn"
                    style={{ padding: 4 }}
                    onClick={() => handleRemove(l.id)}
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
        <div style={{ flex: 1, minWidth: 160 }}>
          <label className="form-label">Supplier</label>
          <select
            className="form-select"
            style={{ width: '100%' }}
            value={form.supplier_id}
            onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
            required
          >
            <option value="">Pilih Supplier</option>
            {availableSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.supplier_name}
              </option>
            ))}
          </select>
          {availableSuppliers.length === 0 && (
            <span className="caption" style={{ display: 'block', marginTop: 4 }}>
              Semua Supplier aktif udah terhubung, atau belum ada Supplier — tambah dulu di tab Suppliers.
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label className="form-label">Catatan (opsional)</label>
          <input
            className="form-input"
            style={{ width: '100%' }}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="mis. lead time 2 minggu"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={create.isPending || !form.supplier_id}>
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

export default PartSupplierModal;
