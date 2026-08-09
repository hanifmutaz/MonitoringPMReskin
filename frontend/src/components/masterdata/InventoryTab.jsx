// src/components/masterdata/InventoryTab.jsx
import { useState } from 'react';
import { Plus, Pencil, Trash2, History, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useInventoryItems, useInventoryRopStatus } from '../../hooks/useInventoryItems';
import { useInventoryItemDetail, useInventoryMovements } from '../../hooks/useInventoryItemDetail';
import { useInventoryMutations } from '../../hooks/useInventoryMutations';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import Modal from '../Modal';
import SearchBar from '../SearchBar';
import Pagination from '../Pagination';
import PageSizeSelector from '../PageSizeSelector';

const DEFAULT_LIMIT = 50;

const emptyForm = { spare_part_number: '', part_name: '', location: '', note: '', lead_time_days: '', initial_stock: '' };

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
    <Modal title={isEdit ? 'Edit Inventory Item' : 'Tambah Inventory Item'} onClose={onClose} width={480}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Spare Part Number</label>
            <input
              className="form-input mono"
              style={{ width: '100%' }}
              value={form.spare_part_number}
              onChange={(e) => setForm({ ...form, spare_part_number: e.target.value })}
              required
            />
            {errors.spare_part_number && (
              <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.spare_part_number}</span>
            )}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Part Name</label>
            <input
              className="form-input"
              style={{ width: '100%' }}
              value={form.part_name}
              onChange={(e) => setForm({ ...form, part_name: e.target.value })}
              required
            />
            {errors.part_name && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.part_name}</span>}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Lokasi (rak/gudang)</label>
            <input
              className="form-input"
              style={{ width: '100%' }}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Lead Time (hari)</label>
            <input
              type="number"
              className="form-input mono"
              style={{ width: '100%', textAlign: 'right' }}
              value={form.lead_time_days}
              min={0}
              onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })}
              placeholder="mis. 14"
            />
            {errors.lead_time_days && (
              <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.lead_time_days}</span>
            )}
            <div className="caption" style={{ fontSize: 10 }}>
              Wajib diisi supaya ROP bisa dihitung. Beda-beda per supplier (lokal vs import).
            </div>
          </div>
          {!isEdit && (
            <div>
              <label className="form-label">Stok Awal</label>
              <input
                type="number"
                className="form-input mono"
                style={{ width: '100%', textAlign: 'right' }}
                value={form.initial_stock}
                min={0}
                onChange={(e) => setForm({ ...form, initial_stock: e.target.value })}
                placeholder="0"
              />
              {errors.initial_stock && (
                <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.initial_stock}</span>
              )}
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Catatan</label>
            <textarea
              className="form-input"
              style={{ width: '100%', minHeight: 50 }}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>

        {errors._general && (
          <div className="error-state" style={{ marginTop: 12, padding: 8, fontSize: 12 }}>
            {errors._general}
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ marginTop: 14 }} disabled={pending}>
          {pending ? 'Menyimpan...' : 'Simpan'}
        </button>
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div>
        <label className="form-label">Jenis</label>
        <select className="form-select" value={movementType} onChange={(e) => setMovementType(e.target.value)}>
          <option value="STOCK_IN">Stock In (tambah)</option>
          <option value="STOCK_OUT">Stock Out (kurang)</option>
          <option value="ADJUSTMENT">Adjustment (koreksi, tambah)</option>
        </select>
      </div>
      <div>
        <label className="form-label">Qty</label>
        <input
          type="number"
          className="form-input mono"
          style={{ width: 90, textAlign: 'right' }}
          value={qty}
          min={1}
          onChange={(e) => setQty(e.target.value)}
          required
        />
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <label className="form-label">Catatan</label>
        <input className="form-input" style={{ width: '100%' }} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary" disabled={adjustStock.isPending}>
        {adjustStock.isPending ? 'Menyimpan...' : 'Catat'}
      </button>
      {error && (
        <div className="error-state" style={{ width: '100%', padding: 8, fontSize: 12 }}>
          {error}
        </div>
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
    <Modal title={`${item.spare_part_number} — ${item.part_name}`} onClose={onClose} width={620}>
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="caption">Stok Saat Ini</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{item.current_stock.toLocaleString('id-ID')}</div>
        </div>
        <div>
          <div className="caption">Lokasi</div>
          <div>{item.location || '-'}</div>
        </div>
        <div>
          <div className="caption">Lead Time</div>
          <div>{item.lead_time_days !== null ? `${item.lead_time_days} hari` : 'Belum diisi'}</div>
        </div>
        <div>
          <div className="caption">Dipakai oleh Part</div>
          <div>{item.linked_parts?.length || 0} part</div>
        </div>
      </div>

      {rop && rop.status !== 'NOT_CONFIGURED' ? (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 8,
            border: '1px solid var(--border-soft)',
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="caption">Konsumsi/Hari</div>
            <div className="mono">{rop.konsumsi_spare_per_hari}</div>
          </div>
          <div>
            <div className="caption">Kebutuhan Spare</div>
            <div className="mono">{rop.kebutuhan_spare}</div>
          </div>
          <div>
            <div className="caption">Safety Stock</div>
            <div className="mono">{rop.safety_stock}</div>
          </div>
          <div>
            <div className="caption">ROP</div>
            <div className="mono" style={{ fontWeight: 700 }}>
              {rop.rop}
            </div>
          </div>
          <div>
            <div className="caption">Status</div>
            <div style={{ color: rop.status === 'ORDER' ? 'var(--danger)' : 'var(--success, #2e7d32)' }}>
              {rop.status === 'ORDER' ? `🛒 Order (${rop.order_qty})` : '✅ OK'}
            </div>
          </div>
        </div>
      ) : (
        <div className="caption" style={{ marginBottom: 16, fontStyle: 'italic' }}>
          ROP belum bisa dihitung - isi Lead Time dan pastikan item ini sudah di-link ke minimal 1 Part.
        </div>
      )}

      {item.linked_parts?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="caption" style={{ marginBottom: 4 }}>
            Part yang terhubung ke stok ini:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {item.linked_parts.map((p) => (
              <li key={p.id}>
                {p.line_name} — {p.jig_name} — {p.drawing_no} ({p.part_name})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 12, marginBottom: 16 }}>
        <div className="caption" style={{ marginBottom: 8 }}>
          Catat mutasi stok baru
        </div>
        <AdjustStockForm item={item} />
      </div>

      <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
        <div className="caption" style={{ marginBottom: 8 }}>
          <History size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
          Histori Mutasi
        </div>
        {(!movementData || movementData.items.length === 0) && (
          <div className="empty-state" style={{ padding: 12 }}>
            Belum ada mutasi.
          </div>
        )}
        {movementData?.items.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th className="mono">Qty</th>
                <th>Catatan</th>
                <th>Oleh</th>
              </tr>
            </thead>
            <tbody>
              {movementData.items.map((m) => (
                <tr key={m.id}>
                  <td className="mono caption">{new Date(m.created_at).toLocaleString('id-ID')}</td>
                  <td>
                    {m.movement_type === 'STOCK_OUT' ? (
                      <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ArrowDownCircle size={12} /> Stock Out
                      </span>
                    ) : (
                      <span style={{ color: 'var(--success, #2e7d32)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ArrowUpCircle size={12} /> {m.movement_type === 'ADJUSTMENT' ? 'Adjustment' : 'Stock In'}
                      </span>
                    )}
                  </td>
                  <td className="mono">{m.qty.toLocaleString('id-ID')}</td>
                  <td className="caption">{m.note || '-'}</td>
                  <td className="caption">{m.user_full_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

  const ropById = new Map((ropData || []).map((r) => [r.id, r]));

  async function handleDelete(item) {
    if (!(await confirm(`Hapus Inventory Item "${item.spare_part_number}"?`))) return;
    setActionError('');
    try {
      await remove.mutateAsync(item.id);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Gagal menghapus Inventory Item');
    }
  }

  return (
    <div>
      <div className="caption" style={{ marginBottom: 12 }}>
        Stok spare part fisik di gudang. 1 Inventory Item bisa dipakai (di-link) oleh lebih dari 1 Part di tab
        &ldquo;Parts&rdquo; — kalau spare part-nya identik (dipasang di jig/line berbeda tapi ambil dari stok yang sama).
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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
        <button type="button" className="btn btn-primary" onClick={() => setModalState({ mode: 'create' })}>
          <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Tambah Inventory Item
        </button>
      </div>

      {actionError && (
        <div className="error-state" style={{ marginBottom: 12, padding: 8, fontSize: 12 }}>
          {actionError}
        </div>
      )}

      {isLoading && !data && <div className="empty-state">Memuat data...</div>}
      {data && data.items.length === 0 && <div className="empty-state">Belum ada Inventory Item.</div>}

      {data && data.items.length > 0 && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Spare Part Number / Nama</th>
                <th>Lokasi</th>
                <th className="mono">Stok</th>
                <th className="mono">ROP</th>
                <th>Status</th>
                <th className="mono">Dipakai Part</th>
                <th style={{ width: 130 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const rop = ropById.get(item.id);
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="mono">{item.spare_part_number}</div>
                      <div className="caption">{item.part_name}</div>
                    </td>
                    <td className="caption">{item.location || '-'}</td>
                    <td className="mono">{item.current_stock.toLocaleString('id-ID')}</td>
                    <td className="mono">{rop?.rop ?? '-'}</td>
                    <td>
                      {!rop || rop.status === 'NOT_CONFIGURED' ? (
                        <span className="caption" style={{ color: 'var(--warning, #b8860b)' }}>
                          Belum lengkap
                        </span>
                      ) : rop.status === 'ORDER' ? (
                        <span style={{ color: 'var(--danger)' }}>🛒 Order ({rop.order_qty})</span>
                      ) : (
                        <span style={{ color: 'var(--success, #2e7d32)' }}>✅ OK</span>
                      )}
                    </td>
                    <td className="mono">{item.linked_part_count}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary btn"
                        style={{ padding: 6, marginRight: 4 }}
                        title="Detail & Mutasi Stok"
                        onClick={() => setDetailItemId(item.id)}
                      >
                        <History size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn"
                        style={{ padding: 6, marginRight: 4 }}
                        onClick={() => setModalState({ mode: 'edit', item })}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn"
                        style={{ padding: 6 }}
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
