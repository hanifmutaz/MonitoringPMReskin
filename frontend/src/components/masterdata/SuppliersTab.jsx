// src/components/masterdata/SuppliersTab.jsx
// Reskin (checklist §3 item 4, batch 2/N - ngikutin pattern LinesTab):
// `.data-table`/`.btn`/`.form-*` lama dilepas TOTAL (§7.3), diganti Tailwind
// + shadcn ui murni. Toolbar (kartu stat + filter pill + search + sort +
// tombol tambah) ngikutin pola LinesTab/referensi Mantis Invoice List.
// BEDA dari LinesTab: search & filter is_active di sini SERVER-SIDE (bukan
// client-side) karena /suppliers API-nya emang udah nerima param
// search/is_active (lihat suppliersApi.js) - jadi query di-debounce
// (useDebouncedValue, pola yang sama dipakai halaman lain) lalu diteruskan
// ke useSuppliers(). Sort & pagination TETAP client-side (gak ada param itu
// di API). Logic create/update/delete/toggle-active TIDAK berubah sama sekali.
//
// DataTable migration (docs/frontend/MIGRATION-PLAN.md Phase 9): hand-
// rolled <table> diganti data-display/DataTable dengan `selection`, sama
// persis pola LinesTab.jsx (client-side pagination, filteredIds bukan
// paged yang di-pass ke useRowSelection). Kolom (5 data + aksi) pindah ke
// suppliersColumns.jsx. Toolbar (KpiCard/filter pill/search/sort) TIDAK
// disentuh, sama alasan LinesTab. Semua state/query/mutation TIDAK berubah.
import { useMemo, useState } from 'react';
import { Plus, Building2, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useSupplierMutations } from '../../hooks/useSupplierMutations';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../../hooks/useRecycleBin';
import { cn } from '../../lib/utils';
import buildSuppliersColumns from './suppliersColumns';
import Modal from '../Modal';
import KpiCard from '../KpiCard';
import SearchBar from '../SearchBar';
import PageSizeSelector from '../PageSizeSelector';
import BulkDeleteBar from '../BulkDeleteBar';
import { DataTable, DataTableNoResult } from '../data-display/DataTable';
import { EmptyState } from '../ui/empty-state';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const emptyForm = { supplier_name: '', contact_person: '', phone: '', email: '', address: '', notes: '' };

const FILTERS = [
  { key: 'all', label: 'Semua', isActive: undefined },
  { key: 'active', label: 'Aktif', isActive: true },
  { key: 'inactive', label: 'Nonaktif', isActive: false },
];

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Nama Supplier (A-Z)' },
  { value: 'name_desc', label: 'Nama Supplier (Z-A)' },
];

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
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <Label className="mb-1.5">Nama Supplier</Label>
          <Input
            value={form.supplier_name}
            onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
            required
          />
          {errors.supplier_name && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.supplier_name}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5">Kontak Person</Label>
            <Input
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5">Telepon</Label>
            <Input
              className="font-[var(--font-mono)]"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5">Alamat</Label>
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5">Catatan</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

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

function SuppliersTab() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name_asc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const debouncedSearch = useDebouncedValue(search, 400);
  const activeFilter = FILTERS.find((f) => f.key === filter);

  const { data: suppliers = [], isLoading, isFetching } = useSuppliers({
    isActive: activeFilter.isActive,
    search: debouncedSearch || undefined,
  });
  // Query terpisah tanpa filter is_active/search buat angka kartu stat -
  // biar "Semua/Aktif/Nonaktif" tetap nunjukin total sebenarnya, bukan
  // ke-reset ikut hasil filter yang lagi aktif.
  const { data: allSuppliers = [] } = useSuppliers({});
  const { update, remove } = useSupplierMutations();
  const confirm = useConfirm();
  const [modalState, setModalState] = useState(null); // null | { mode: 'create' } | { mode: 'edit', supplier }
  const [deleteError, setDeleteError] = useState('');
  const [bulkError, setBulkError] = useState('');

  const counts = useMemo(
    () => ({
      all: allSuppliers.length,
      active: allSuppliers.filter((s) => s.is_active).length,
      inactive: allSuppliers.filter((s) => !s.is_active).length,
    }),
    [allSuppliers]
  );

  const sorted = useMemo(
    () =>
      [...suppliers].sort((a, b) =>
        sort === 'name_asc'
          ? a.supplier_name.localeCompare(b.supplier_name)
          : b.supplier_name.localeCompare(a.supplier_name)
      ),
    [suppliers, sort]
  );
  const paged = useMemo(() => sorted.slice((page - 1) * limit, page * limit), [sorted, page, limit]);
  // Client-side pagination - "select all" nyakup SEMUA row yang cocok
  // filter (`sorted`), bukan cuma halaman aktif. Lihat komentar sama di
  // LinesTab.jsx.
  const filteredIds = useMemo(() => sorted.map((s) => s.id), [sorted]);
  const selection = useRowSelection(filteredIds);
  const bulkDelete = useBulkDeleteMutation('suppliers');

  function handleFilterChange(key) {
    setFilter(key);
    setPage(1);
  }

  async function handleDelete(supplier) {
    if (!(await confirm(`Hapus Supplier "${supplier.supplier_name}"?`))) return;
    setDeleteError('');
    try {
      await remove.mutateAsync(supplier.id);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus Supplier');
    }
  }

  const columns = buildSuppliersColumns({
    onEdit: (s) => setModalState({ mode: 'edit', supplier: s }),
    onDelete: handleDelete,
    onToggleActive: (s, checked) => update.mutate({ id: s.id, payload: { is_active: checked } }),
  });

  function handleResetFilter() {
    setFilter('all');
    setSearch('');
    setPage(1);
  }

  async function handleBulkDelete() {
    if (!(await confirm(`Hapus ${selection.selectedCount} Supplier terpilih (dari semua data, bukan cuma halaman ini)? Bisa direstore lewat Recycle Bin.`)))
      return;
    setBulkError('');
    try {
      await bulkDelete.mutateAsync(selection.selectedIds);
      selection.clear();
    } catch (err) {
      setBulkError(err.response?.data?.message || 'Gagal menghapus Supplier terpilih');
    }
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <KpiCard icon={<Building2 size={16} />} label="Total Supplier" value={counts.all} status="accent" />
        <KpiCard icon={<CheckCircle2 size={16} />} label="Aktif" value={counts.active} status="ok" />
        <KpiCard icon={<XCircle size={16} />} label="Nonaktif" value={counts.inactive} status="muted" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => handleFilterChange(f.key)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                  active ? 'bg-[var(--accent-dim)] text-primary' : 'text-[var(--text-dim)] hover:bg-secondary'
                )}
              >
                {f.label}
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-[var(--font-mono)] text-[11px]',
                    active ? 'bg-primary text-primary-foreground' : 'bg-[var(--panel-3)] text-[var(--text-faint)]'
                  )}
                >
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nama Supplier..." />
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setModalState({ mode: 'create' })}>
            <Plus size={14} /> Tambah Supplier
          </Button>
        </div>
      </div>

      {deleteError && (
        <div className="mb-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
          {deleteError}
        </div>
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
        label="Supplier"
      />

      <DataTable
        columns={columns}
        rows={paged}
        getRowKey={(s) => s.id}
        isLoading={isLoading}
        isRefreshing={isFetching && !isLoading}
        selection={selection}
        page={page}
        limit={limit}
        total={sorted.length}
        onPageChange={setPage}
        emptyState={
          filter !== 'all' || search ? (
            <DataTableNoResult onReset={handleResetFilter} />
          ) : (
            <EmptyState icon={Inbox} title="Belum ada Supplier" />
          )
        }
      />

      {!isLoading && sorted.length > 0 && (
        <div className="mt-3 flex justify-end">
          <PageSizeSelector value={limit} onChange={(v) => { setLimit(v); setPage(1); }} options={[10, 25, 50, 100]} />
        </div>
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
