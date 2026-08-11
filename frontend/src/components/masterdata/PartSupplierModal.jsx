// src/components/masterdata/PartSupplierModal.jsx
// Reskin (checklist §3 item 4, batch 3/N): `.data-table`/`.btn`/`.form-*`
// lama dilepas TOTAL, diganti Tailwind + shadcn ui murni supaya konsisten
// sama PartsTab (Modal pembungkusnya) yang udah direskin. Logic
// create/setPrimary/remove TIDAK berubah sama sekali.
import { useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import { usePartSuppliers, usePartSupplierMutations } from '../../hooks/usePartSuppliers';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import { cn } from '../../lib/utils';
import Modal from '../Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
    <Modal title={`Supplier — ${part.drawing_no} (${part.jig_name})`} onClose={onClose} width={600}>
      <p className="mb-2.5 text-xs text-muted-foreground">
        Bintang menandai Supplier <strong className="text-foreground">utama</strong> (biasa dipesen ke situ duluan) —
        klik bintang buat pindah/lepas status utama.
      </p>

      {isLoading ? (
        <div className="py-6 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>
      ) : (
        <div className="mb-4 overflow-hidden rounded-lg border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="w-[38px] px-3 py-2" />
                <th className="px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                  Supplier
                </th>
                <th className="px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                  Kontak
                </th>
                <th className="px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                  Catatan
                </th>
                <th className="w-[44px] px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {links.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-[var(--text-faint)]">
                    Belum ada Supplier terhubung ke Part ini.
                  </td>
                </tr>
              )}
              {links.map((l) => (
                <tr key={l.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      title={l.is_primary ? 'Supplier utama - klik buat lepas' : 'Jadikan Supplier utama'}
                      onClick={() => handleTogglePrimary(l)}
                      disabled={setPrimary.isPending}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-secondary',
                        l.is_primary ? 'text-warn' : 'text-[var(--text-faint)]'
                      )}
                    >
                      <Star size={13} fill={l.is_primary ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="px-3 py-2.5 font-[var(--font-mono)] text-[13px]">
                    {l.supplier_name}
                    {!l.supplier_is_active && (
                      <span className="block text-[11px] text-[var(--text-faint)]">(nonaktif)</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--text-dim)]">
                    {l.contact_person || '-'}
                    {l.phone && <div className="font-[var(--font-mono)]">{l.phone}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--text-dim)]">{l.notes || '-'}</td>
                  <td className="px-3 py-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemove(l.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <Label className="mb-1.5">Supplier</Label>
          <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Supplier" />
            </SelectTrigger>
            <SelectContent>
              {availableSuppliers.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.supplier_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {availableSuppliers.length === 0 && (
            <p className="mt-1 text-[11px] text-[var(--text-faint)]">
              Semua Supplier aktif udah terhubung, atau belum ada Supplier — tambah dulu di tab Suppliers.
            </p>
          )}
        </div>
        <div className="min-w-[180px] flex-1">
          <Label className="mb-1.5">Catatan (opsional)</Label>
          <Input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="mis. lead time 2 minggu"
          />
        </div>
        <Button type="submit" size="icon" disabled={create.isPending || !form.supplier_id}>
          <Plus size={14} />
        </Button>
      </form>
      {error && (
        <div className="mt-2.5 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{error}</div>
      )}
    </Modal>
  );
}

export default PartSupplierModal;
