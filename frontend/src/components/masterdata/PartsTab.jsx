// src/components/masterdata/PartsTab.jsx
import { useState } from 'react';
import { Plus, Pencil, Trash2, Link2, Truck } from 'lucide-react';
import { useParts } from '../../hooks/useParts';
import { usePartMutations } from '../../hooks/usePartMutations';
import { useLines } from '../../hooks/useLines';
import { useInventoryItems } from '../../hooks/useInventoryItems';
import { useInventoryMutations } from '../../hooks/useInventoryMutations';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useConfirm } from '../../contexts/ConfirmDialogContext';
import Modal from '../Modal';
import SearchBar from '../SearchBar';
import Pagination from '../Pagination';
import PageSizeSelector from '../PageSizeSelector';
import ClMappingModal from './ClMappingModal';
import PartSupplierModal from './PartSupplierModal';

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
          line_id: initial.line_id,
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
    <Modal title={isEdit ? 'Edit Part' : 'Tambah Part'} onClose={onClose} width={520}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="form-label">Line</label>
            <select
              className="form-select"
              style={{ width: '100%' }}
              value={form.line_id}
              onChange={(e) => setForm({ ...form, line_id: e.target.value })}
              required
            >
              <option value="">Pilih Line</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.line_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Jig Name</label>
            <input
              className="form-input"
              style={{ width: '100%' }}
              value={form.jig_name}
              onChange={(e) => setForm({ ...form, jig_name: e.target.value })}
              placeholder="mis. Contact Cutting A"
              required
            />
            {errors.jig_name && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.jig_name}</span>}
          </div>
          <div>
            <label className="form-label">Drawing No</label>
            <input
              className="form-input mono"
              style={{ width: '100%' }}
              value={form.drawing_no}
              onChange={(e) => setForm({ ...form, drawing_no: e.target.value })}
              required
            />
            {errors.drawing_no && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.drawing_no}</span>}
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
          </div>
          <div>
            <label className="form-label">Target Shot</label>
            <input
              type="number"
              className="form-input mono"
              style={{ width: '100%', textAlign: 'right' }}
              value={form.target_shot}
              min={1}
              onChange={(e) => setForm({ ...form, target_shot: e.target.value })}
              required
            />
            {errors.target_shot && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.target_shot}</span>}
          </div>

          <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}>
            <span className="caption">Referensi Spare Part (opsional — manual, integrasi Inventory ditunda)</span>
          </div>

          <div>
            <label className="form-label">Spare Part Number</label>
            <input
              className="form-input mono"
              style={{ width: '100%' }}
              value={form.spare_part_number}
              onChange={(e) => setForm({ ...form, spare_part_number: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">Qty</label>
            <input
              type="number"
              className="form-input mono"
              style={{ width: '100%', textAlign: 'right' }}
              value={form.spare_part_qty}
              min={0}
              onChange={(e) => setForm({ ...form, spare_part_qty: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Lokasi</label>
            <input
              className="form-input"
              style={{ width: '100%' }}
              value={form.spare_part_location}
              onChange={(e) => setForm({ ...form, spare_part_location: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Catatan</label>
            <textarea
              className="form-input"
              style={{ width: '100%', minHeight: 50 }}
              value={form.spare_part_note}
              onChange={(e) => setForm({ ...form, spare_part_note: e.target.value })}
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

      {isEdit && <InventoryLinkSection part={initial} />}
    </Modal>
  );
}

function InventoryLinkSection({ part }) {
  const { data: inventoryData } = useInventoryItems({ limit: 100 });
  const { linkPart } = useInventoryMutations();
  const [selectedId, setSelectedId] = useState(part.inventory_item_id || '');
  const [error, setError] = useState('');

  async function handleLink() {
    setError('');
    try {
      await linkPart.mutateAsync({ partId: part.id, inventoryItemId: selectedId === '' ? null : Number(selectedId) });
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal link Inventory Item');
    }
  }

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
      <div className="caption" style={{ marginBottom: 8 }}>
        Link ke Inventory Item (stok spare part fisik) — opsional, bisa dishare dengan Part lain kalau spare part-nya
        identik.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select className="form-select" style={{ flex: 1 }} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Tidak di-link</option>
          {(inventoryData?.items || []).map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.spare_part_number} — {inv.part_name} (stok: {inv.current_stock})
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={handleLink} disabled={linkPart.isPending}>
          {linkPart.isPending ? 'Menyimpan...' : 'Simpan Link'}
        </button>
      </div>
      {error && (
        <div className="error-state" style={{ marginTop: 8, padding: 8, fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function PartsTab() {
  const [search, setSearch] = useState('');
  const [lineId, setLineId] = useState('');
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
    line_id: lineId || undefined,
    page,
    limit,
  });
  const { remove } = usePartMutations();
  const confirm = useConfirm();

  async function handleDelete(part) {
    if (!(await confirm(`Hapus Part "${part.drawing_no}" (Jig: ${part.jig_name})?`))) return;
    setDeleteError('');
    try {
      await remove.mutateAsync(part.id);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus Part');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Cari drawing no / nama part..."
          />
          <select
            className="form-select"
            value={lineId}
            onChange={(e) => {
              setLineId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Line</option>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.line_name}
              </option>
            ))}
          </select>
          <PageSizeSelector
            value={limit}
            onChange={(v) => {
              setLimit(v);
              setPage(1); // ganti limit -> mulai lagi dari halaman 1, biar gak nyasar ke halaman yang udah gak ada
            }}
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModalState({ mode: 'create' })}>
          <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Tambah Part
        </button>
      </div>

      {deleteError && (
        <div className="error-state" style={{ marginBottom: 12, padding: 8, fontSize: 12 }}>
          {deleteError}
        </div>
      )}

      {isLoading && !data && <div className="empty-state">Memuat data...</div>}
      {data && data.items.length === 0 && <div className="empty-state">Belum ada part yang cocok.</div>}

      {data && data.items.length > 0 && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Jig</th>
                <th>Drawing No / Part Name</th>
                <th className="mono">Target Shot</th>
                <th className="mono">CL Count</th>
                <th className="mono">Supplier</th>
                <th>Status</th>
                <th style={{ width: 160 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((part) => (
                <tr key={part.id}>
                  <td className="mono">{part.line_name}</td>
                  <td className="caption">{part.jig_name}</td>
                  <td>
                    <div>{part.part_name}</div>
                    <div className="caption mono">{part.drawing_no}</div>
                    {part.inventory_item_id && (
                      <div className="caption" style={{ fontSize: 10 }}>
                        Stok: {part.inv_spare_part_number} ({part.inv_current_stock})
                      </div>
                    )}
                  </td>
                  <td className="mono">{part.target_shot.toLocaleString('id-ID')}</td>
                  <td className="mono">{part.cl_count}</td>
                  <td className="mono">{part.supplier_count}</td>
                  <td className="caption">{part.is_active ? 'Aktif' : 'Nonaktif'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary btn"
                      style={{ padding: 6, marginRight: 4 }}
                      title="CL Mapping"
                      onClick={() => setClMappingPart(part)}
                    >
                      <Link2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn"
                      style={{ padding: 6, marginRight: 4 }}
                      title="Supplier"
                      onClick={() => setSupplierPart(part)}
                    >
                      <Truck size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn"
                      style={{ padding: 6, marginRight: 4 }}
                      onClick={() => setModalState({ mode: 'edit', part })}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn"
                      style={{ padding: 6 }}
                      onClick={() => handleDelete(part)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
