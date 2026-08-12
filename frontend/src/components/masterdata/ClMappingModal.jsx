// src/components/masterdata/ClMappingModal.jsx
// Reskin (checklist §3 item 4, batch 3/N): `.data-table`/`.btn`/`.form-*`
// lama dilepas TOTAL, diganti Tailwind + shadcn ui murni supaya konsisten
// sama PartsTab (Modal pembungkusnya) yang udah direskin. Logic
// create/remove mapping TIDAK berubah sama sekali.
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useClMapping, useClMappingMutations } from '../../hooks/useClMapping';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../../hooks/useRecycleBin';
import Modal from '../Modal';
import BulkDeleteBar from '../BulkDeleteBar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const emptyForm = { cl_no: '', product_name: '', jig_name: '' };

function ClMappingModal({ part, onClose }) {
  const { data: mappings = [], isLoading } = useClMapping(part.id);
  const { create, remove } = useClMappingMutations(part.id);
  const confirm = useConfirm();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const selection = useRowSelection(mappings.map((m) => m.id));
  const bulkDelete = useBulkDeleteMutation('cl-mapping');

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

  async function handleBulkDelete() {
    if (!(await confirm(`Hapus ${selection.selectedCount} mapping terpilih? Bisa direstore lewat Recycle Bin.`)))
      return;
    setError('');
    try {
      await bulkDelete.mutateAsync(selection.selectedIds);
      selection.clear();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus mapping terpilih');
    }
  }

  return (
    <Modal title={`CL Mapping — ${part.drawing_no} (${part.jig_name})`} onClose={onClose} width={560}>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>
      ) : (
        <div className="mb-4">
          <BulkDeleteBar
            count={selection.selectedCount}
            onDelete={handleBulkDelete}
            onClear={selection.clear}
            pending={bulkDelete.isPending}
            label="mapping"
          />
          <div className="overflow-hidden rounded-lg border border-border">
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
                <th className="px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                  CL No
                </th>
                <th className="px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                  Product
                </th>
                <th className="px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                  Jig
                </th>
                <th className="w-[44px] px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-[var(--text-faint)]">
                    Belum ada CL No terpetakan.
                  </td>
                </tr>
              )}
              {mappings.map((m) => (
                <tr key={m.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selection.isSelected(m.id)}
                      onChange={() => selection.toggle(m.id)}
                      className="h-3.5 w-3.5 accent-[var(--accent)]"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-[var(--font-mono)] text-[13px]">{m.cl_no}</td>
                  <td className="px-3 py-2.5 text-[13px]">{m.product_name || '-'}</td>
                  <td className="px-3 py-2.5 text-[13px]">{m.jig_name || '-'}</td>
                  <td className="px-3 py-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemove(m.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div>
          <Label className="mb-1.5">CL No</Label>
          <Input value={form.cl_no} onChange={(e) => setForm({ ...form, cl_no: e.target.value })} required />
        </div>
        <div>
          <Label className="mb-1.5">Product</Label>
          <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1.5">Jig</Label>
          <Input value={form.jig_name} onChange={(e) => setForm({ ...form, jig_name: e.target.value })} />
        </div>
        <Button type="submit" size="icon" disabled={create.isPending}>
          <Plus size={14} />
        </Button>
      </form>
      {error && (
        <div className="mt-2.5 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{error}</div>
      )}
    </Modal>
  );
}

export default ClMappingModal;