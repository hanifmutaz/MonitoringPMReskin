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
import { useState } from 'react';
import { Plus, Pencil, Trash2, Link2, Truck, Package, ListChecks } from 'lucide-react';
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
import Pagination from '../Pagination';
import PageSizeSelector from '../PageSizeSelector';
import BulkDeleteBar from '../BulkDeleteBar';
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
              <SelectTrigger>
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
          <SelectTrigger className="flex-1">
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
            <SelectTrigger className="h-9 w-[180px]">
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

      {isLoading && !data && <div className="py-8 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>}
      {data && data.items.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--text-faint)]">Belum ada part yang cocok.</div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
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
                    {['Line', 'Jig', 'Drawing No / Part Name', 'Target Shot', 'CL', 'Supplier', 'Status', 'Aksi'].map(
                      (h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((part) => (
                    <tr key={part.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selection.isSelected(part.id)}
                          onChange={() => selection.toggle(part.id)}
                          className="h-3.5 w-3.5 accent-[var(--accent)]"
                        />
                      </td>
                      <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{part.line_name}</td>
                      <td className="px-3 py-3 text-xs text-[var(--text-dim)]">{part.jig_name}</td>
                      <td className="px-3 py-3">
                        <div className="text-[13px]">{part.part_name}</div>
                        <div className="font-[var(--font-mono)] text-xs text-[var(--text-dim)]">
                          {part.drawing_no}
                        </div>
                        {part.inventory_item_id && (
                          <div className="text-[10px] text-[var(--text-faint)]">
                            Stok: {part.inv_spare_part_number} ({part.inv_current_stock})
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-[var(--font-mono)] text-[13px]">
                        {part.target_shot.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-3 text-center font-[var(--font-mono)] text-[13px]">{part.cl_count}</td>
                      <td className="px-3 py-3 text-center font-[var(--font-mono)] text-[13px]">
                        {part.supplier_count}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            part.is_active
                              ? 'rounded px-1.5 py-0.5 text-[11px] font-medium bg-ok-dim text-ok'
                              : 'rounded px-1.5 py-0.5 text-[11px] font-medium bg-[var(--panel-3)] text-[var(--text-faint)]'
                          }
                        >
                          {part.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            title="CL Mapping"
                            onClick={() => setClMappingPart(part)}
                          >
                            <Link2 size={13} />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            title="Supplier"
                            onClick={() => setSupplierPart(part)}
                          >
                            <Truck size={13} />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setModalState({ mode: 'edit', part })}
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDelete(part)}
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
          </div>
          <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />
        </>
      )}

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