// src/components/masterdata/InventoryTab.jsx
// Reskin (checklist §3 item 4, batch 5/N - Inventory): `.data-table`/`.btn`/
// `.form-*` lama dilepas TOTAL, diganti Tailwind + shadcn ui murni. Toolbar
// (search + tombol tambah) ngikutin pola tab lain, search/pagination TETAP
// server-side (gak diubah, sama kayak sebelumnya). Kartu stat BEDA dari
// Parts - di sini datanya jujur/agregat asli karena `/inventory/rop-status`
// (dipakai useInventoryRopStatus) balikin status SEMUA item sekaligus
// (bukan per-halaman kayak /parts), jadi 3 kartu Total/Perlu Order/Belum
// Lengkap dihitung dari situ, bukan dikarang. Warna status ROP di tabel &
// modal detail sebelumnya hardcode var(--danger)/var(--success,#2e7d32)/
// var(--warning,#b8860b) - dipetakan ke token bg-danger-dim/text-danger,
// bg-ok-dim/text-ok, bg-warn-dim/text-warn yang udah dipakai di seluruh app.
// Logic create/update/delete/adjustStock/detail/histori mutasi TIDAK
// berubah sama sekali.
import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, History, ArrowDownCircle, ArrowUpCircle, Package, ShoppingCart, AlertCircle } from 'lucide-react';
import { useInventoryItems, useInventoryRopStatus } from '../../hooks/useInventoryItems';
import { useInventoryItemDetail, useInventoryMovements } from '../../hooks/useInventoryItemDetail';
import { useInventoryMutations } from '../../hooks/useInventoryMutations';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../../hooks/useRecycleBin';
import Modal from '../Modal';
import KpiCard from '../KpiCard';
import SearchBar from '../SearchBar';
import Pagination from '../Pagination';
import PageSizeSelector from '../PageSizeSelector';
import BulkDeleteBar from '../BulkDeleteBar';
import SelectAllAcrossPagesBar from '../SelectAllAcrossPagesBar';
import { fetchInventoryItems } from '../../api/inventoryApi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const DEFAULT_LIMIT = 50;

const emptyForm = { spare_part_number: '', part_name: '', location: '', note: '', lead_time_days: '', initial_stock: '' };

function RopBadge({ rop }) {
  if (!rop || rop.status === 'NOT_CONFIGURED') {
    return <span className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-warn-dim text-warn">Belum lengkap</span>;
  }
  if (rop.status === 'ORDER') {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-danger-dim text-danger">
        <ShoppingCart size={11} /> Order ({rop.order_qty})
      </span>
    );
  }
  return <span className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-ok-dim text-ok">OK</span>;
}

function ItemFormModal({ initial, onClose }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    isEdit
      ? {
          spare_part_number: initial.spare_part_number,
          part_name: initial.part_name,
          location: initial.location || '',
          note: initial.note || '',
          lead_time_days: initial.lead_time_days ?? '',
        }
      : emptyForm
  );
  const [errors, setErrors] = useState({});
  const { create, update } = useInventoryMutations();
  const pending = create.isPending || update.isPending;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    const payload = {
      spare_part_number: form.spare_part_number,
      part_name: form.part_name,
      location: form.location || undefined,
      note: form.note || undefined,
      lead_time_days: form.lead_time_days === '' ? undefined : Number(form.lead_time_days),
      ...(isEdit ? {} : { initial_stock: form.initial_stock === '' ? 0 : Number(form.initial_stock) }),
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: initial.id, payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setErrors(err.response?.data?.errors || { _general: err.response?.data?.message || 'Gagal menyimpan' });
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Inventory Item' : 'Tambah Inventory Item'} onClose={onClose} width={520}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="mb-1.5">Spare Part Number</Label>
            <Input
              className="font-[var(--font-mono)]"
              value={form.spare_part_number}
              onChange={(e) => setForm({ ...form, spare_part_number: e.target.value })}
              required
            />
            {errors.spare_part_number && (
              <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.spare_part_number}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5">Part Name</Label>
            <Input
              value={form.part_name}
              onChange={(e) => setForm({ ...form, part_name: e.target.value })}
              required
            />
            {errors.part_name && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.part_name}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5">Lokasi (rak/gudang)</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5">Lead Time (hari)</Label>
            <Input
              type="number"
              className="text-right font-[var(--font-mono)]"
              value={form.lead_time_days}
              min={0}
              onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })}
              placeholder="mis. 14"
            />
            {errors.lead_time_days && (
              <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.lead_time_days}</p>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">
              Wajib diisi supaya ROP bisa dihitung. Beda-beda per supplier (lokal vs import).
            </p>
          </div>
          {!isEdit && (
            <div>
              <Label className="mb-1.5">Stok Awal</Label>
              <Input
                type="number"
                className="text-right font-[var(--font-mono)]"
                value={form.initial_stock}
                min={0}
                onChange={(e) => setForm({ ...form, initial_stock: e.target.value })}
                placeholder="0"
              />
              {errors.initial_stock && (
                <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.initial_stock}</p>
              )}
            </div>
          )}
          <div className="sm:col-span-2">
            <Label className="mb-1.5">Catatan</Label>
            <Textarea
              className="min-h-[60px]"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
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
    </Modal>
  );
}

function AdjustStockForm({ item, onDone }) {
  const [movementType, setMovementType] = useState('STOCK_IN');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const { adjustStock } = useInventoryMutations();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await adjustStock.mutateAsync({ id: item.id, payload: { movement_type: movementType, qty: Number(qty), note } });
      setQty('');
      setNote('');
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mencatat mutasi stok');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <Label className="mb-1.5">Jenis</Label>
        <Select value={movementType} onValueChange={setMovementType}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="STOCK_IN">Stock In (tambah)</SelectItem>
            <SelectItem value="STOCK_OUT">Stock Out (kurang)</SelectItem>
            <SelectItem value="ADJUSTMENT">Adjustment (koreksi, tambah)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-1.5">Qty</Label>
        <Input
          type="number"
          className="w-[90px] text-right font-[var(--font-mono)]"
          value={qty}
          min={1}
          onChange={(e) => setQty(e.target.value)}
          required
        />
      </div>
      <div className="min-w-[160px] flex-1">
        <Label className="mb-1.5">Catatan</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button type="submit" disabled={adjustStock.isPending}>
        {adjustStock.isPending ? 'Menyimpan...' : 'Catat'}
      </Button>
      {error && (
        <div className="w-full rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{error}</div>
      )}
    </form>
  );
}

function ItemDetailModal({ itemId, onClose }) {
  const { data: item } = useInventoryItemDetail(itemId);
  const { data: movementData } = useInventoryMovements(itemId, { page: 1, limit: 20 });
  const { data: ropData } = useInventoryRopStatus();

  if (!item) return null;

  const rop = (ropData || []).find((r) => r.id === itemId);

  return (
    <Modal title={`${item.spare_part_number} — ${item.part_name}`} onClose={onClose} width={640}>
      <div className="mb-4 flex flex-wrap gap-5">
        <div>
          <div className="text-xs text-muted-foreground">Stok Saat Ini</div>
          <div className="font-[var(--font-display)] text-[22px] font-bold">
            {item.current_stock.toLocaleString('id-ID')}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Lokasi</div>
          <div className="text-sm">{item.location || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Lead Time</div>
          <div className="text-sm">{item.lead_time_days !== null ? `${item.lead_time_days} hari` : 'Belum diisi'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Dipakai oleh Part</div>
          <div className="text-sm">{item.linked_parts?.length || 0} part</div>
        </div>
      </div>

      {rop && rop.status !== 'NOT_CONFIGURED' ? (
        <div className="mb-4 flex flex-wrap gap-5 rounded-lg border border-[var(--border-soft)] p-2.5">
          <div>
            <div className="text-xs text-muted-foreground">Konsumsi/Hari</div>
            <div className="font-[var(--font-mono)] text-sm">{rop.konsumsi_spare_per_hari}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Kebutuhan Spare</div>
            <div className="font-[var(--font-mono)] text-sm">{rop.kebutuhan_spare}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Safety Stock</div>
            <div className="font-[var(--font-mono)] text-sm">{rop.safety_stock}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">ROP</div>
            <div className="font-[var(--font-mono)] text-sm font-bold">{rop.rop}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <RopBadge rop={rop} />
          </div>
        </div>
      ) : (
        <p className="mb-4 text-xs italic text-muted-foreground">
          ROP belum bisa dihitung - isi Lead Time dan pastikan item ini sudah di-link ke minimal 1 Part.
        </p>
      )}

      {item.linked_parts?.length > 0 && (
        <div className="mb-4">
          <div className="mb-1 text-xs text-muted-foreground">Part yang terhubung ke stok ini:</div>
          <ul className="m-0 list-disc pl-[18px] text-xs">
            {item.linked_parts.map((p) => (
              <li key={p.id}>
                {p.line_name} — {p.jig_name} — {p.drawing_no} ({p.part_name})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 border-t border-[var(--border-soft)] pt-3">
        <div className="mb-2 text-xs text-muted-foreground">Catat mutasi stok baru</div>
        <AdjustStockForm item={item} />
      </div>

      <div className="border-t border-[var(--border-soft)] pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <History size={12} /> Histori Mutasi
        </div>
        {(!movementData || movementData.items.length === 0) && (
          <div className="py-4 text-center text-sm text-[var(--text-faint)]">Belum ada mutasi.</div>
        )}
        {movementData?.items.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {['Tanggal', 'Jenis', 'Qty', 'Catatan', 'Oleh'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movementData.items.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                    <td className="px-3 py-2 font-[var(--font-mono)] text-xs text-[var(--text-dim)]">
                      {new Date(m.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2">
                      {m.movement_type === 'STOCK_OUT' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                          <ArrowDownCircle size={12} /> Stock Out
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-ok">
                          <ArrowUpCircle size={12} /> {m.movement_type === 'ADJUSTMENT' ? 'Adjustment' : 'Stock In'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-[var(--font-mono)] text-[13px]">
                      {m.qty.toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--text-dim)]">{m.note || '-'}</td>
                    <td className="px-3 py-2 text-xs text-[var(--text-dim)]">{m.user_full_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

function InventoryTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [modalState, setModalState] = useState(null);
  const [detailItemId, setDetailItemId] = useState(null);
  const [actionError, setActionError] = useState('');

  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading } = useInventoryItems({ search: debouncedSearch || undefined, page, limit });
  const { data: ropData } = useInventoryRopStatus();
  const { remove } = useInventoryMutations();
  const confirm = useConfirm();
  const pageIds = useMemo(() => data?.items?.map((i) => i.id) ?? [], [data]);
  const selection = useRowSelection(pageIds);
  const bulkDelete = useBulkDeleteMutation('inventory-items');
  const [bulkError, setBulkError] = useState('');

  // "Pilih semua N Inventory Item yang cocok filter" - lihat komentar sama
  // di PartsTab.jsx (handleSelectAllMatching), pola identik.
  async function handleSelectAllMatching() {
    const all = await fetchInventoryItems({ search: search || undefined, page: 1, limit: data.total });
    selection.selectIds(all.items.map((i) => i.id));
  }

  const ropById = useMemo(() => new Map((ropData || []).map((r) => [r.id, r])), [ropData]);

  const ropCounts = useMemo(() => {
    const list = ropData || [];
    return {
      total: list.length,
      order: list.filter((r) => r.status === 'ORDER').length,
      incomplete: list.filter((r) => r.status === 'NOT_CONFIGURED').length,
    };
  }, [ropData]);

  async function handleDelete(item) {
    if (!(await confirm(`Hapus Inventory Item "${item.spare_part_number}"?`))) return;
    setActionError('');
    try {
      await remove.mutateAsync(item.id);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Gagal menghapus Inventory Item');
    }
  }

  async function handleBulkDelete() {
    if (
      !(await confirm(
        `Hapus ${selection.selectedCount} Inventory Item terpilih? Bisa direstore lewat Recycle Bin.`
      ))
    )
      return;
    setBulkError('');
    try {
      await bulkDelete.mutateAsync(selection.selectedIds);
      selection.clear();
    } catch (err) {
      setBulkError(err.response?.data?.message || 'Gagal menghapus Inventory Item terpilih');
    }
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Stok spare part fisik di gudang. 1 Inventory Item bisa dipakai (di-link) oleh lebih dari 1 Part di tab
        &ldquo;Parts&rdquo; — kalau spare part-nya identik (dipasang di jig/line berbeda tapi ambil dari stok yang
        sama).
      </p>

      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <KpiCard icon={<Package size={16} />} label="Total Item" value={ropCounts.total} status="accent" />
        <KpiCard icon={<ShoppingCart size={16} />} label="Perlu Order" value={ropCounts.order} status="danger" />
        <KpiCard icon={<AlertCircle size={16} />} label="Belum Lengkap" value={ropCounts.incomplete} status="warn" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Cari spare part number / nama..."
          />
          <PageSizeSelector
            value={limit}
            onChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
          />
        </div>
        <Button onClick={() => setModalState({ mode: 'create' })}>
          <Plus size={14} /> Tambah Inventory Item
        </Button>
      </div>

      {actionError && (
        <div className="mb-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
          {actionError}
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
        label="Inventory Item"
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
      {data && data.items.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--text-faint)]">Belum ada Inventory Item.</div>
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
                    {['Spare Part Number / Nama', 'Lokasi', 'Stok', 'ROP', 'Status', 'Dipakai Part', 'Aksi'].map(
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
                  {data.items.map((item) => {
                    const rop = ropById.get(item.id);
                    return (
                      <tr key={item.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selection.isSelected(item.id)}
                            onChange={() => selection.toggle(item.id)}
                            className="h-3.5 w-3.5 accent-[var(--accent)]"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-[var(--font-mono)] text-[13px]">{item.spare_part_number}</div>
                          <div className="text-xs text-[var(--text-dim)]">{item.part_name}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--text-dim)]">{item.location || '-'}</td>
                        <td className="px-3 py-3 text-right font-[var(--font-mono)] text-[13px]">
                          {item.current_stock.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-3 text-right font-[var(--font-mono)] text-[13px]">{rop?.rop ?? '-'}</td>
                        <td className="px-3 py-3">
                          <RopBadge rop={rop} />
                        </td>
                        <td className="px-3 py-3 text-center font-[var(--font-mono)] text-[13px]">
                          {item.linked_part_count}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              title="Detail & Mutasi Stok"
                              onClick={() => setDetailItemId(item.id)}
                            >
                              <History size={13} />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setModalState({ mode: 'edit', item })}
                            >
                              <Pencil size={13} />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />
        </>
      )}

      {modalState && (
        <ItemFormModal initial={modalState.mode === 'edit' ? modalState.item : null} onClose={() => setModalState(null)} />
      )}

      {detailItemId && <ItemDetailModal itemId={detailItemId} onClose={() => setDetailItemId(null)} />}
    </div>
  );
}

export default InventoryTab;