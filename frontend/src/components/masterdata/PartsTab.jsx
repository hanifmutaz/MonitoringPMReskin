// src/components/masterdata/PartsTab.jsx
// Reskin (checklist §3 item 4, batch 3/N - ngikutin pattern LinesTab/
// SuppliersTab): `.data-table`/`.btn`/`.form-*` lama dilepas TOTAL (§7.3),
// diganti Tailwind + shadcn ui murni. Toolbar (search + filter Line + tombol
// tambah) ngikutin pola LinesTab/referensi Mantis Invoice List. BEDA dari
// LinesTab: search/line_id/pagination di sini SERVER-SIDE (bukan
// client-side) karena udah gitu dari awal (lihat partsApi.js/partQueries.js
// - backend nerima param search/line_id/page/limit) - jadi TIDAK diubah
// jadi client-side kayak LinesTab, cuma dibungkus debounce yang sama kayak
// SuppliersTab. Gak ada kartu stat Aktif/Nonaktif kayak Lines/Suppliers
// karena API /parts gak expose filter/count is_active - drpd ngarang angka,
// cuma dikasih 2 kartu yang datanya nyata: Total Part (dari `data.total`,
// hasil query yang lagi aktif) & Line Aktif (dari `lines`, query terpisah
// yang emang udah jalan). Logic create/update/delete/CL-mapping/Supplier-link
// TIDAK berubah sama sekali.
//
// DataTable migration (docs/frontend/MIGRATION-PLAN.md Phase 9, batch 3/N,
// ngikutin LinesTab batch 1/N "lock the pattern"): hand-rolled <table>
// diganti data-display/DataTable, kolom pindah ke partsColumns.jsx. BEDA
// dari LinesTab: ini server-side paginated dengan `SelectAllAcrossPagesBar`
// (pola sama persis PmLineHistoryPage/PartsTab yang lama) - `selection`
// tetap di-scope ke `pageIds` (halaman aktif doang), bukan semua data,
// karena server-side gak punya semua id di memori sekaligus. DataTable's
// built-in Pagination dipasangin langsung ke `data.page/limit/total` dari
// response server (sama field yang tadinya di-pass ke Pagination manual).
import { useState } from 'react';
import { Plus, Package, ListChecks, Inbox } from 'lucide-react';
import { useParts } from '../../hooks/useParts';
import { usePartMutations } from '../../hooks/usePartMutations';
import { useLines } from '../../hooks/useLines';
import { useInventoryItems } from '../../hooks/useInventoryItems';
import { useInventoryMutations } from '../../hooks/useInventoryMutations';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../../hooks/useRecycleBin';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import Modal from '../Modal';
import KpiCard from '../KpiCard';
import SearchBar from '../SearchBar';
import PageSizeSelector from '../PageSizeSelector';
import BulkDeleteBar from '../BulkDeleteBar';
import SelectAllAcrossPagesBar from '../SelectAllAcrossPagesBar';
import DataTable, { DataTableNoResult } from '../data-display/DataTable';
import { EmptyState } from '../ui/empty-state';
import buildPartsColumns from './partsColumns';
import { fetchParts } from '../../api/partsApi';
import ClMappingModal from './ClMappingModal';
import PartSupplierModal from './PartSupplierModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const DEFAULT_LIMIT = 50;

const emptyForm = {
  line_id: '',
  jig_name: '',
  drawing_no: '',
  part_name: '',
  target_shot: '',
  spare_part_number: '',
  spare_part_qty: '',
  spare_part_location: '',
  spare_part_note: '',
};

function PartFormModal({ initial, lines, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    initial
      ? {
          line_id: String(initial.line_id),
          jig_name: initial.jig_name,
          drawing_no: initial.drawing_no,
          part_name: initial.part_name,
          target_shot: initial.target_shot,
          spare_part_number: initial.spare_part_number || '',
          spare_part_qty: initial.spare_part_qty ?? '',
          spare_part_location: initial.spare_part_location || '',
          spare_part_note: initial.spare_part_note || '',
        }
      : emptyForm
  );
  const [errors, setErrors] = useState({});
  const { create, update } = usePartMutations();
  const pending = create.isPending || update.isPending;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    const payload = {
      line_id: Number(form.line_id),
      jig_name: form.jig_name,
      drawing_no: form.drawing_no,
      part_name: form.part_name,
      target_shot: Number(form.target_shot),
      spare_part_number: form.spare_part_number || undefined,
      spare_part_qty: form.spare_part_qty === '' ? undefined : Number(form.spare_part_qty),
      spare_part_location: form.spare_part_location || undefined,
      spare_part_note: form.spare_part_note || undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: initial.id, payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setErrors(err.response?.data?.errors || { _general: err.response?.data?.message || 'Gagal menyimpan Part' });
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Part' : 'Tambah Part'} onClose={onClose} width={560}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5">Line</Label>
            <Select value={form.line_id} onValueChange={(v) => setForm({ ...form, line_id: v })}>
              <SelectTrigger aria-label="Pilih Line">
                <SelectValue placeholder="Pilih Line" />
              </SelectTrigger>
              <SelectContent>
                {lines.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.line_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5">Jig Name</Label>
            <Input
              value={form.jig_name}
              onChange={(e) => setForm({ ...form, jig_name: e.target.value })}
              placeholder="mis. Contact Cutting A"
              required
            />
            {errors.jig_name && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.jig_name}</p>}
          </div>
          <div>
            <Label className="mb-1.5">Drawing No</Label>
            <Input
              className="font-[var(--font-mono)]"
              value={form.drawing_no}
              onChange={(e) => setForm({ ...form, drawing_no: e.target.value })}
              required
            />
            {errors.drawing_no && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.drawing_no}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5">Part Name</Label>
            <Input
              value={form.part_name}
              onChange={(e) => setForm({ ...form, part_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label className="mb-1.5">Target Shot</Label>
            <Input
              type="number"
              className="text-right font-[var(--font-mono)]"
              value={form.target_shot}
              min={1}
              onChange={(e) => setForm({ ...form, target_shot: e.target.value })}
              required
            />
            {errors.target_shot && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.target_shot}</p>}
          </div>

          <div className="border-t border-[var(--border-soft)] pt-3 sm:col-span-2">
            <span className="text-xs text-muted-foreground">
              Referensi Spare Part (opsional — manual, integrasi Inventory ditunda)
            </span>
          </div>

          <div>
            <Label className="mb-1.5">Spare Part Number</Label>
            <Input
              className="font-[var(--font-mono)]"
              value={form.spare_part_number}
              onChange={(e) => setForm({ ...form, spare_part_number: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5">Qty</Label>
            <Input
              type="number"
              className="text-right font-[var(--font-mono)]"
              value={form.spare_part_qty}
              min={0}
              onChange={(e) => setForm({ ...form, spare_part_qty: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5">Lokasi</Label>
            <Input
              value={form.spare_part_location}
              onChange={(e) => setForm({ ...form, spare_part_location: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5">Catatan</Label>
            <Textarea
              className="min-h-[60px]"
              value={form.spare_part_note}
              onChange={(e) => setForm({ ...form, spare_part_note: e.target.value })}
            />
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

      {isEdit && <InventoryLinkSection part={initial} />}
    </Modal>
  );
}

function InventoryLinkSection({ part }) {
  const { data: inventoryData } = useInventoryItems({ limit: 100 });
  const { linkPart } = useInventoryMutations();
  const [selectedId, setSelectedId] = useState(part.inventory_item_id ? String(part.inventory_item_id) : 'none');
  const [error, setError] = useState('');

  async function handleLink() {
    setError('');
    try {
      await linkPart.mutateAsync({
        partId: part.id,
        inventoryItemId: selectedId === 'none' ? null : Number(selectedId),
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal link Inventory Item');
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--border-soft)] pt-3">
      <p className="mb-2 text-xs text-muted-foreground">
        Link ke Inventory Item (stok spare part fisik) — opsional, bisa dishare dengan Part lain kalau spare
        part-nya identik.
      </p>
      <div className="flex gap-2">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="flex-1" aria-label="Pilih Inventory Item untuk di-link">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Tidak di-link</SelectItem>
            {(inventoryData?.items || []).map((inv) => (
              <SelectItem key={inv.id} value={String(inv.id)}>
                {inv.spare_part_number} — {inv.part_name} (stok: {inv.current_stock})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={handleLink} disabled={linkPart.isPending}>
          {linkPart.isPending ? 'Menyimpan...' : 'Simpan Link'}
        </Button>
      </div>
      {error && (
        <div className="mt-2 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{error}</div>
      )}
    </div>
  );
}

function PartsTab() {
  const [search, setSearch] = useState('');
  const [lineId, setLineId] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [modalState, setModalState] = useState(null);
  const [clMappingPart, setClMappingPart] = useState(null);
  const [supplierPart, setSupplierPart] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const debouncedSearch = useDebouncedValue(search);
  const { data: lines = [] } = useLines({ isActive: true });
  const { data, isLoading } = useParts({
    search: debouncedSearch || undefined,
    line_id: lineId === 'all' ? undefined : lineId,
    page,
    limit,
  });
  const { remove } = usePartMutations();
  const confirm = useConfirm();
  const pageIds = data?.items?.map((p) => p.id) ?? [];
  const selection = useRowSelection(pageIds);
  const bulkDelete = useBulkDeleteMutation('parts');
  const [bulkError, setBulkError] = useState('');

  // "Pilih semua N Part yang cocok filter" - beda dari toggleAllOnPage
  // (cuma nyakup halaman aktif) karena Parts paginasinya SERVER-SIDE.
  // Nembak ulang endpoint yang sama pakai limit = total, ambil id-nya
  // doang, lalu union ke selection yang udah ada (bukan replace - row
  // yang sempat di-uncheck manual di halaman lain tetap ke-uncheck).
  async function handleSelectAllMatching() {
    const all = await fetchParts({
      lineId: lineId === 'all' ? undefined : lineId,
      search: search || undefined,
      page: 1,
      limit: data.total,
    });
    selection.selectIds(all.items.map((p) => p.id));
  }

  async function handleDelete(part) {
    if (!(await confirm(`Hapus Part "${part.drawing_no}" (Jig: ${part.jig_name})?`))) return;
    setDeleteError('');
    try {
      await remove.mutateAsync(part.id);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus Part');
    }
  }

  async function handleBulkDelete() {
    if (!(await confirm(`Hapus ${selection.selectedCount} Part terpilih? Bisa direstore lewat Recycle Bin.`))) return;
    setBulkError('');
    try {
      await bulkDelete.mutateAsync(selection.selectedIds);
      selection.clear();
    } catch (err) {
      setBulkError(err.response?.data?.message || 'Gagal menghapus Part terpilih');
    }
  }

  function handleResetFilter() {
    setSearch('');
    setLineId('all');
    setPage(1);
  }

  const hasActiveFilter = search.trim() !== '' || lineId !== 'all';

  // Not memoized, same convention as LinesTab/pmLineColumns/pmPartColumns
  // call sites - columns are cheap to rebuild each render.
  const columns = buildPartsColumns({
    onClMapping: setClMappingPart,
    onSupplier: setSupplierPart,
    onEdit: (part) => setModalState({ mode: 'edit', part }),
    onDelete: handleDelete,
  });

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <KpiCard icon={<Package size={16} />} label="Total Part" value={data?.total ?? '—'} status="accent" />
        <KpiCard icon={<ListChecks size={16} />} label="Line Aktif" value={lines.length} status="ok" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Cari drawing no / nama part..."
          />
          <Select
            value={lineId}
            onValueChange={(v) => {
              setLineId(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[180px]" aria-label="Urutkan Part">
              <SelectValue placeholder="Semua Line" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Line</SelectItem>
              {lines.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.line_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PageSizeSelector
            value={limit}
            onChange={(v) => {
              setLimit(v);
              setPage(1); // ganti limit -> mulai lagi dari halaman 1, biar gak nyasar ke halaman yang udah gak ada
            }}
          />
        </div>
        <Button onClick={() => setModalState({ mode: 'create' })}>
          <Plus size={14} /> Tambah Part
        </Button>
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
        label="Part"
      />

      {data && selection.allOnPageSelected && (
        <SelectAllAcrossPagesBar
          pageCount={pageIds.length}
          total={data.total}
          alreadySelectedAll={selection.selectedCount >= data.total}
          onSelectAll={handleSelectAllMatching}
        />
      )}

      {isLoading && !data && <div className="py-8 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>}

      <DataTable
        columns={columns}
        rows={data?.items}
        getRowKey={(part) => part.id}
        isLoading={isLoading && !data}
        page={data?.page}
        limit={data?.limit}
        total={data?.total}
        onPageChange={setPage}
        selection={selection}
        emptyState={
          hasActiveFilter ? (
            <DataTableNoResult description="Tidak ada Part yang cocok." onReset={handleResetFilter} />
          ) : (
            <EmptyState icon={Inbox} title="Belum ada Part" />
          )
        }
      />

      {modalState && (
        <PartFormModal
          initial={modalState.mode === 'edit' ? modalState.part : null}
          lines={lines}
          onClose={() => setModalState(null)}
        />
      )}

      {clMappingPart && <ClMappingModal part={clMappingPart} onClose={() => setClMappingPart(null)} />}
      {supplierPart && <PartSupplierModal part={supplierPart} onClose={() => setSupplierPart(null)} />}
    </div>
  );
}

export default PartsTab;