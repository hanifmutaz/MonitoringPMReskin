// src/components/masterdata/LinesTab.jsx
// Reskin (checklist §3 item 4, batch 1/N - "lock the pattern" buat 3 tab
// Master Data lain): `.data-table`/`.btn`/`.form-*` lama dilepas TOTAL
// (§7.3), diganti Tailwind + shadcn ui (Input/Label/Select/Button) murni.
// Toolbar diadaptasi dari referensi Mantis "Invoice List" (kartu stat +
// tab-filter berlabel jumlah + search + sort + tombol tambah) sesuai arahan
// Mutaz - TAPI cuma pola visualnya; datanya nyata dari `lines` (Total/Aktif/
// Nonaktif), bukan angka karangan. Search/filter/sort/pagination di sini
// SEMUA client-side (data <100 baris, gak ada endpoint search/sort di
// backend /lines) - bukan fitur baru, cuma preset default limit=10 biar
// konsisten sama pola Pagination/PageSizeSelector yang dipakai halaman lain.
// Logic create/update/delete/toggle-active TIDAK berubah sama sekali.
//
// DataTable migration (docs/frontend/MIGRATION-PLAN.md Phase 9, "lock the
// pattern" batch 1/N buat PartsTab/SuppliersTab/InventoryTab): hand-rolled
// <table> diganti data-display/DataTable, kolom dipindah ke
// linesColumns.jsx (pola sama persis Phase 7/8's pmPartColumns.jsx /
// pmLineColumns.jsx). `selection` di-pass langsung dari useRowSelection ke
// DataTable - shape-nya udah cocok, gak perlu adapter (per DataTable's own
// header comment). Pagination lokal (`../Pagination`) DIHAPUS - DataTable
// render Pagination-nya sendiri kalau page/limit/total/onPageChange
// di-pass, itu file yang sama (data-display/Pagination) cuma via shim,
// jadi gak ada duplikasi. PageSizeSelector TETAP di luar DataTable (bukan
// concern DataTable, per Phase 5/7/8 - DataTable gak pernah render page
// size control, cuma page nav).
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, ListChecks, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import { fetchLines } from '../../api/linesApi';
import { useLineMutations } from '../../hooks/useLineMutations';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../../hooks/useRecycleBin';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import { cn } from '../../lib/utils';
import Modal from '../Modal';
import KpiCard from '../KpiCard';
import SearchBar from '../SearchBar';
import PageSizeSelector from '../PageSizeSelector';
import BulkDeleteBar from '../BulkDeleteBar';
import DataTable, { DataTableNoResult } from '../data-display/DataTable';
import { EmptyState } from '../ui/empty-state';
import buildLinesColumns from './linesColumns';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const emptyForm = { line_name: '', auto_reset_weekly_on_monthly: '' };

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'active', label: 'Aktif' },
  { key: 'inactive', label: 'Nonaktif' },
];

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Nama Line (A-Z)' },
  { value: 'name_desc', label: 'Nama Line (Z-A)' },
];

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
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <Label className="mb-1.5">Nama Line</Label>
          <Input
            value={form.line_name}
            onChange={(e) => setForm({ ...form, line_name: e.target.value })}
            required
          />
        </div>

        <div>
          <Label className="mb-1.5">Override Auto-Reset Weekly on Monthly</Label>
          <Select
            value={form.auto_reset_weekly_on_monthly === '' ? 'null' : form.auto_reset_weekly_on_monthly}
            onValueChange={(v) => setForm({ ...form, auto_reset_weekly_on_monthly: v === 'null' ? '' : v })}
          >
            <SelectTrigger aria-label="Pilih Override Auto-Reset Weekly on Monthly">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null">Ikut Setting Global</SelectItem>
              <SelectItem value="true">Override: TRUE (selalu ikut reset)</SelectItem>
              <SelectItem value="false">Override: FALSE (jangan pernah ikut reset)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{error}</div>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan'}
        </Button>
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
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name_asc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const counts = useMemo(
    () => ({
      all: lines.length,
      active: lines.filter((l) => l.is_active).length,
      inactive: lines.filter((l) => !l.is_active).length,
    }),
    [lines]
  );

  const filtered = useMemo(() => {
    let result = lines;
    if (filter === 'active') result = result.filter((l) => l.is_active);
    if (filter === 'inactive') result = result.filter((l) => !l.is_active);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((l) => l.line_name.toLowerCase().includes(q));
    }
    const sorted = [...result].sort((a, b) =>
      sort === 'name_asc' ? a.line_name.localeCompare(b.line_name) : b.line_name.localeCompare(a.line_name)
    );
    return sorted;
  }, [lines, filter, search, sort]);

  const paged = useMemo(() => filtered.slice((page - 1) * limit, page * limit), [filtered, page, limit]);
  // Client-side pagination (semua data Line udah kebaca di memori) - jadi
  // "select all" bisa langsung nyakup SEMUA row yang cocok filter
  // (`filtered`), bukan cuma `paged` (halaman aktif doang). Beda dari
  // Parts/Inventory yang server-side, butuh fetch tambahan buat ini
  // (lihat handleSelectAllMatching di PartsTab.jsx/InventoryTab.jsx).
  const filteredIds = useMemo(() => filtered.map((l) => l.id), [filtered]);
  const selection = useRowSelection(filteredIds);
  const bulkDelete = useBulkDeleteMutation('lines');
  const [bulkError, setBulkError] = useState('');
  const hasActiveFilter = filter !== 'all' || search.trim() !== '';

  async function handleBulkDelete() {
    if (!(await confirm(`Hapus ${selection.selectedCount} Line terpilih (dari semua data, bukan cuma halaman ini)? Bisa direstore lewat Recycle Bin.`))) return;
    setBulkError('');
    try {
      await bulkDelete.mutateAsync(selection.selectedIds);
      selection.clear();
    } catch (err) {
      setBulkError(err.response?.data?.message || 'Gagal menghapus Line terpilih');
    }
  }

  function handleFilterChange(key) {
    setFilter(key);
    setPage(1);
  }

  async function handleDelete(line) {
    if (!(await confirm(`Hapus Line "${line.line_name}"?`))) return;
    setDeleteError('');
    try {
      await remove.mutateAsync(line.id);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus Line');
    }
  }

  function handleToggleActive(line, checked) {
    update.mutate({ id: line.id, payload: { is_active: checked } });
  }

  function handleResetFilter() {
    setFilter('all');
    setSearch('');
    setPage(1);
  }

  // Not memoized, same as buildPmLineColumns()/buildPmPartColumns() call
  // sites (PmLineStatusPage.jsx/PmPartMonitoringPage.jsx) - columns are
  // cheap to rebuild each render, no measured perf need for memo here.
  const columns = buildLinesColumns({
    onToggleActive: handleToggleActive,
    onEdit: (line) => setModalState({ mode: 'edit', line }),
    onDelete: handleDelete,
  });

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <KpiCard icon={<ListChecks size={16} />} label="Total Line" value={counts.all} status="accent" />
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
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nama Line..." />
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[180px]" aria-label="Urutkan Line">
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
            <Plus size={14} /> Tambah Line
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
        label="Line"
      />

      {!isLoading && filtered.length > 0 && (
        <div className="mb-3 flex justify-end">
          <PageSizeSelector value={limit} onChange={(v) => { setLimit(v); setPage(1); }} options={[10, 25, 50, 100]} />
        </div>
      )}

      <DataTable
        columns={columns}
        rows={paged}
        getRowKey={(line) => line.id}
        isLoading={isLoading}
        page={page}
        limit={limit}
        total={filtered.length}
        onPageChange={setPage}
        selection={selection}
        emptyState={
          hasActiveFilter ? (
            <DataTableNoResult description="Tidak ada Line yang cocok." onReset={handleResetFilter} />
          ) : (
            <EmptyState icon={Inbox} title="Belum ada Line" />
          )
        }
      />

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