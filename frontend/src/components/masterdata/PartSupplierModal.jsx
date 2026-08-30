// src/components/masterdata/PartSupplierModal.jsx
// Reskin (checklist §3 item 4, batch 3/N): `.data-table`/`.btn`/`.form-*`
// lama dilepas TOTAL, diganti Tailwind + shadcn ui murni supaya konsisten
// sama PartsTab (Modal pembungkusnya) yang udah direskin. Logic
// create/setPrimary/remove TIDAK berubah sama sekali.
//
// DataTable migration (docs/frontend/MIGRATION-PLAN.md Phase 9): hand-
// rolled <table> diganti data-display/DataTable dengan `selection`. Kolom
// (Star primary-toggle + 3 data) didefinisikan lokal, sama alasan
// ClMappingModal.jsx (1 consumer, kecil). PRESERVED AS-IS, bukan
// diperbaiki (di luar scope migrasi presentational): komentar `locked`
// bilang "isinya locked notice" pas Package B terkunci, tapi gak ada JSX
// notice yang beneran ada - kalau locked, query di-`enabled:false`,
// `links` tetap default `[]`, jadi yang kelihatan cuma empty state biasa
// ("Belum ada Supplier terhubung"), bukan notice soal Package B. Ini
// perilaku pre-existing (bukan sesuatu yang baru muncul akibat migrasi
// ini) - dicatat di sini, tidak diperbaiki, karena bukan bagian dari task
// DataTable migration.
import { useState } from 'react';
import { Plus, Trash2, Star, Inbox } from 'lucide-react';
import { usePartSuppliers, usePartSupplierMutations } from '../../hooks/usePartSuppliers';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../../hooks/useRecycleBin';
import { cn } from '../../lib/utils';
import Modal from '../Modal';
import BulkDeleteBar from '../BulkDeleteBar';
import { DataTable } from '../data-display/DataTable';
import { EmptyState } from '../ui/empty-state';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const emptyForm = { supplier_id: '', notes: '' };

function buildPartSupplierColumns({ onTogglePrimary, onRemove, setPrimaryPending }) {
  return [
    {
      key: 'primary',
      header: '',
      render: (l) => (
        <button
          type="button"
          title={l.is_primary ? 'Supplier utama - klik buat lepas' : 'Jadikan Supplier utama'}
          onClick={() => onTogglePrimary(l)}
          disabled={setPrimaryPending}
          className={cn(
            'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50',
            l.is_primary ? 'text-warn' : 'text-[var(--text-faint)]'
          )}
        >
          <Star size={13} fill={l.is_primary ? 'currentColor' : 'none'} />
        </button>
      ),
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      render: (l) => (
        <span className="font-[var(--font-mono)] text-[13px]">
          {l.supplier_name}
          {!l.supplier_is_active && <span className="block text-[11px] text-[var(--text-faint)]">(nonaktif)</span>}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Kontak',
      className: 'text-xs text-[var(--text-dim)]',
      render: (l) => (
        <>
          {l.contact_person || '-'}
          {l.phone && <div className="font-[var(--font-mono)]">{l.phone}</div>}
        </>
      ),
    },
    {
      key: 'notes',
      header: 'Catatan',
      className: 'text-xs text-[var(--text-dim)]',
      render: (l) => l.notes || '-',
    },
    {
      key: 'actions',
      header: '',
      render: (l) => (
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onRemove(l.id)} aria-label={`Lepas Supplier ${l.supplier_name}`}>
          <Trash2 size={12} />
        </Button>
      ),
    },
  ];
}

function PartSupplierModal({ part, onClose }) {
  const { hasPackage } = useAuth();
  // Fitur Paket B - dicek PALING ATAS, SEBELUM hooks data fetching di bawah
  // dipanggil dengan enabled:false biar gak nembak API yang bakal ke-block
  // backend juga (licenseMiddleware.js). Modal tetap kebuka (tombol
  // "Supplier" di PartsTab TETAP bisa diklik) - cuma isinya locked notice.
  const locked = !hasPackage('B');

  const { data: links = [], isLoading } = usePartSuppliers(part.id, { enabled: !locked });
  const { data: allSuppliers = [] } = useSuppliers({ isActive: true, enabled: !locked });
  const { create, setPrimary, remove } = usePartSupplierMutations(part.id);
  const confirm = useConfirm();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const selection = useRowSelection(links.map((l) => l.id));
  const bulkDelete = useBulkDeleteMutation('part-suppliers');

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

  async function handleBulkDelete() {
    if (!(await confirm(`Lepas ${selection.selectedCount} Supplier terpilih dari Part ini? Bisa direstore lewat Recycle Bin.`)))
      return;
    setError('');
    try {
      await bulkDelete.mutateAsync(selection.selectedIds);
      selection.clear();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal melepas Supplier terpilih');
    }
  }

  function handleTogglePrimary(link) {
    // Klik bintang yang UDAH utama -> lepas status utama. Klik yang belum
    // utama -> jadi utama (yang lama otomatis ke-unset, lihat
    // partSupplierService.setPrimary di backend).
    setPrimary.mutate({ id: link.id, isPrimary: !link.is_primary });
  }

  const columns = buildPartSupplierColumns({
    onTogglePrimary: handleTogglePrimary,
    onRemove: handleRemove,
    setPrimaryPending: setPrimary.isPending,
  });

  return (
    <Modal title={`Supplier — ${part.drawing_no} (${part.jig_name})`} onClose={onClose} width={600}>
      <p className="mb-2.5 text-xs text-muted-foreground">
        Bintang menandai Supplier <strong className="text-foreground">utama</strong> (biasa dipesen ke situ duluan) —
        klik bintang buat pindah/lepas status utama.
      </p>

      <div className="mb-4">
        <BulkDeleteBar
          count={selection.selectedCount}
          onDelete={handleBulkDelete}
          onClear={selection.clear}
          pending={bulkDelete.isPending}
          label="Supplier link"
        />
        <DataTable
          columns={columns}
          rows={links}
          getRowKey={(l) => l.id}
          isLoading={isLoading}
          selection={selection}
          emptyState={<EmptyState icon={Inbox} title="Belum ada Supplier terhubung ke Part ini" />}
        />
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <Label className="mb-1.5">Supplier</Label>
          <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
            <SelectTrigger aria-label="Pilih Supplier">
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
        <Button type="submit" size="icon" disabled={create.isPending || !form.supplier_id} aria-label="Tambah Supplier">
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