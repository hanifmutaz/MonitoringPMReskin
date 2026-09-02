// src/components/masterdata/ClMappingModal.jsx
// Reskin (checklist §3 item 4, batch 3/N): `.data-table`/`.btn`/`.form-*`
// lama dilepas TOTAL, diganti Tailwind + shadcn ui murni supaya konsisten
// sama PartsTab (Modal pembungkusnya) yang udah direskin. Logic
// create/remove mapping TIDAK berubah sama sekali.
//
// DataTable migration (docs/frontend/MIGRATION-PLAN.md Phase 9): hand-
// rolled <table> diganti data-display/DataTable dengan `selection`. Kolom
// didefinisikan LOKAL di sini (bukan file terpisah) - cuma 4 kolom, cuma
// 1 consumer (modal ini doang), gak ada preseden builder-function terpisah
// yang worth dipertahankan untuk kasus sekecil ini (beda dari
// linesColumns.jsx/partsColumns.jsx yang filenya lebih besar dan/atau ada
// potensi reuse). Tidak ada pagination sama sekali (semua mapping 1 Part
// ditampilkan sekaligus, biasanya <10 baris) - sama seperti
// PmLineStatusPage, props page/limit/total/onPageChange diomit semua.
import { useState } from 'react';
import { Plus, Trash2, Inbox } from 'lucide-react';
import { useClMapping, useClMappingMutations } from '../../hooks/useClMapping';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../../hooks/useRecycleBin';
import Modal from '../Modal';
import BulkDeleteBar from '../BulkDeleteBar';
import { DataTable } from '../data-display/DataTable';
import { EmptyState } from '../ui/empty-state';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const emptyForm = { cl_no: '', product_name: '', jig_name: '' };

function buildClMappingColumns({ onRemove }) {
  return [
    {
      key: 'cl_no',
      header: 'CL No',
      render: (m) => <span className="font-[var(--font-mono)] text-[13px]">{m.cl_no}</span>,
    },
    { key: 'product_name', header: 'Product', render: (m) => m.product_name || '-' },
    { key: 'jig_name', header: 'Jig', render: (m) => m.jig_name || '-' },
    {
      key: 'actions',
      header: '',
      srHeader: 'Aksi',
      render: (m) => (
        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onRemove(m.id)} aria-label={`Hapus mapping CL ${m.cl_no}`}>
          <Trash2 size={12} />
        </Button>
      ),
    },
  ];
}

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

  const columns = buildClMappingColumns({ onRemove: handleRemove });

  return (
    <Modal title={`CL Mapping — ${part.drawing_no} (${part.jig_name})`} onClose={onClose} width={560}>
      <div className="mb-4">
        <BulkDeleteBar
          count={selection.selectedCount}
          onDelete={handleBulkDelete}
          onClear={selection.clear}
          pending={bulkDelete.isPending}
          label="mapping"
        />
        <DataTable
          columns={columns}
          rows={mappings}
          getRowKey={(m) => m.id}
          isLoading={isLoading}
          selection={selection}
          emptyState={<EmptyState icon={Inbox} title="Belum ada CL No terpetakan" />}
        />
      </div>

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
        <Button type="submit" size="icon" disabled={create.isPending} aria-label="Tambah mapping">
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
