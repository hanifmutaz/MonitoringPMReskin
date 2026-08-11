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
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ListChecks, CheckCircle2, XCircle } from 'lucide-react';
import { fetchLines } from '../../api/linesApi';
import { useLineMutations } from '../../hooks/useLineMutations';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import { cn } from '../../lib/utils';
import Modal from '../Modal';
import KpiCard from '../KpiCard';
import SearchBar from '../SearchBar';
import Pagination from '../Pagination';
import PageSizeSelector from '../PageSizeSelector';
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
            <SelectTrigger>
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
            <SelectTrigger className="h-9 w-[180px]">
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

      {isLoading && <div className="py-8 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>}

      {!isLoading && paged.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--text-faint)]">Tidak ada Line yang cocok.</div>
      )}

      {!isLoading && paged.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                  Nama Line
                </th>
                <th className="px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                  Status
                </th>
                <th className="px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                  Auto-Reset Override
                </th>
                <th className="w-[90px] px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((line) => (
                <tr key={line.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                  <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{line.line_name}</td>
                  <td className="px-3 py-3">
                    <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={line.is_active}
                        onChange={(e) => update.mutate({ id: line.id, payload: { is_active: e.target.checked } })}
                        className="h-3.5 w-3.5 accent-[var(--accent)]"
                      />
                      {line.is_active ? 'Aktif' : 'Nonaktif'}
                    </label>
                  </td>
                  <td className="px-3 py-3 text-xs text-[var(--text-dim)]">
                    {line.auto_reset_weekly_on_monthly === null
                      ? 'Ikut Global'
                      : line.auto_reset_weekly_on_monthly
                        ? 'TRUE'
                        : 'FALSE'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setModalState({ mode: 'edit', line })}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(line)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <PageSizeSelector value={limit} onChange={(v) => { setLimit(v); setPage(1); }} options={[10, 25, 50, 100]} />
          <Pagination page={page} limit={limit} total={filtered.length} onPageChange={setPage} />
        </div>
      )}

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
