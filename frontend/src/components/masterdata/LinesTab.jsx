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
import { useAuth } from '../../contexts/AuthContext';
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

const emptyForm = { line_name: '', jumlah_shift: '2', auto_reset_weekly_on_monthly: '' };

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
          jumlah_shift: String(initial.jumlah_shift || 2),
          auto_reset_weekly_on_monthly:
            initial.auto_reset_weekly_on_monthly === null ? '' : String(initial.auto_reset_weekly_on_monthly),
        }
      : emptyForm
  );
  const [error, setError] = useState('');
  // Nama Line sama dengan Line di Recycle Bin yang masih punya Part -> minta
  // konfirmasi (restore Line lama / sengaja buat baru). null | { message, part_count }
  const [binConflict, setBinConflict] = useState(null);
  const { create, update } = useLineMutations();
  const pending = create.isPending || update.isPending;

  async function submit(extra = {}) {
    setError('');
    const payload = {
      line_name: form.line_name,
      jumlah_shift: Number(form.jumlah_shift),
      auto_reset_weekly_on_monthly:
        form.auto_reset_weekly_on_monthly === '' ? null : form.auto_reset_weekly_on_monthly === 'true',
      ...extra,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: initial.id, payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 409 && data?.errors?.code === 'LINE_IN_RECYCLE_BIN') {
        setBinConflict({ message: data.message, part_count: data.errors.part_count });
        return;
      }
      setError(data?.message || 'Gagal menyimpan Line');
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setBinConflict(null);
    return submit();
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
          <Label className="mb-1.5">Jumlah Shift/Hari</Label>
          <Select value={form.jumlah_shift} onValueChange={(v) => setForm({ ...form, jumlah_shift: v })}>
            <SelectTrigger aria-label="Pilih Jumlah Shift per Hari">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Shift</SelectItem>
              <SelectItem value="3">3 Shift</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            Dipakai buat hitung poin PM Monthly/Weekly proporsional ke pemakaian real Line ini.
          </p>
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

        {binConflict && (
          <div className="space-y-2 rounded-lg border border-[var(--warn)] bg-[var(--warn-dim)] px-3 py-2.5 text-xs">
            <p className="text-[var(--text)]">{binConflict.message}</p>
            <p className="text-[var(--text-faint)]">
              Restore: Line lama kembali aktif beserta {binConflict.part_count} Part-nya (tidak ada data baru dibuat).
              Buat baru: Line kosong baru dengan nama sama; Part lama tetap di Line lama di Recycle Bin.
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={pending} onClick={() => submit({ on_deleted_line_conflict: 'restore' })}>
                Restore Line lama
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => submit({ on_deleted_line_conflict: 'create_new' })}
              >
                Buat sebagai Line baru
              </Button>
            </div>
          </div>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </form>
    </Modal>
  );
}

function LinesTab() {
  const { hasPermission, isAdmin } = useAuth();
  const canEdit = hasPermission('masterdata.edit');
  const canDelete = hasPermission('masterdata.delete');
  // Bulk delete lewat Recycle Bin engine (POST /recycle-bin/:entity/bulk-delete)
  // yang Admin-only di backend - jadi checkbox + bar-nya cuma buat Admin.
  const canBulkDelete = isAdmin;
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
  const [limit, setLimit] = useState(20);

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
      const result = await bulkDelete.mutateAsync(selection.selectedIds);
      selection.clear();
      if (result?.skipped?.length) {
        const lines = result.skipped.slice(0, 5).map((s) => `• ${s.reason}`);
        const more = result.skipped.length > 5 ? `\n+${result.skipped.length - 5} lainnya` : '';
        setBulkError(
          `${result.skipped.length} Line TIDAK dihapus, ${result.deletedIds?.length ?? 0} berhasil.\n${lines.join('\n')}${more}\nHapus Part-nya dulu (atau pindahkan ke Line lain), lalu hapus Line.`
        );
      }
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
    canEdit,
    canDelete,
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
          {canEdit && (
            <Button onClick={() => setModalState({ mode: 'create' })}>
            <Plus size={14} /> Tambah Line
          </Button>
          )}
        </div>
      </div>

      {deleteError && (
        <div className="mb-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
          {deleteError}
        </div>
      )}

      {bulkError && (
        <div className="mb-3 whitespace-pre-line rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
          {bulkError}
        </div>
      )}

      {canBulkDelete && (

        <BulkDeleteBar
        count={selection.selectedCount}
        onDelete={handleBulkDelete}
        onClear={selection.clear}
        pending={bulkDelete.isPending}
        label="Line"
      />

      )}

      {!isLoading && filtered.length > 0 && (
        <div className="mb-3 flex justify-end">
          <PageSizeSelector value={limit} onChange={(v) => { setLimit(v); setPage(1); }} options={[10, 20, 50, 100]} />
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
        selection={canBulkDelete ? selection : undefined}
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
