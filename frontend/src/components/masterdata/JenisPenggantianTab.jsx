// src/components/masterdata/JenisPenggantianTab.jsx
//
// Kelola Jenis Penggantian PM Part (Terjadwal, PM Early, Broken, Aus, dst).
// Admin only (tab-nya disembunyikan untuk role lain, backend POST/PATCH juga
// requireRole('Admin')). Tidak ada tombol hapus: jenis yang sudah dipakai
// riwayat cukup dinonaktifkan. Kode (code) dibuat otomatis dari nama dan tidak
// bisa diubah, karena dipakai sebagai nilai di pm_part_history.
import { useState } from 'react';
import { Inbox, Pencil, Plus } from 'lucide-react';
import { useJenisPenggantian, useJenisPenggantianMutations } from '../../hooks/useJenisPenggantian';
import Modal from '../Modal';
import DataTable from '../data-display/DataTable';
import { EmptyState } from '../ui/empty-state';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

function KetepatanNote({ counts }) {
  return counts ? (
    <span className="text-[13px]">Dihitung</span>
  ) : (
    <span className="text-[13px] text-[var(--text-faint)]">Dikecualikan</span>
  );
}

function JenisFormModal({ initial, onClose }) {
  const isEdit = !!initial;
  const [label, setLabel] = useState(initial?.label ?? '');
  const [counts, setCounts] = useState(initial?.counts_in_ketepatan ?? true);
  const [error, setError] = useState('');
  const { create, update } = useJenisPenggantianMutations();
  const pending = create.isPending || update.isPending;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = { label: label.trim(), counts_in_ketepatan: counts };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: initial.id, payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      setError(fieldErrors?.label || err.response?.data?.message || 'Gagal menyimpan jenis penggantian');
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Jenis Penggantian' : 'Tambah Jenis Penggantian'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <Label className="mb-1.5">Nama Jenis</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={50} required />
          {isEdit && (
            <p className="mt-1 text-xs text-[var(--text-faint)]">
              Kode <span className="font-[var(--font-mono)]">{initial.code}</span> tidak bisa diubah.
            </p>
          )}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={counts}
              onChange={(e) => setCounts(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-[var(--accent)]"
            />
            <span>
              Hitung di Ketepatan PM Part
              <span className="mt-0.5 block text-xs text-[var(--text-faint)]">
                Kalau dimatikan, penggantian jenis ini dikecualikan dari persentase ketepatan (seperti Broken).
                Perubahan hanya berlaku untuk penggantian yang diinput sesudahnya, riwayat lama tidak berubah.
              </span>
            </span>
          </label>
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

function JenisPenggantianTab() {
  const { all, isLoading } = useJenisPenggantian();
  const { update } = useJenisPenggantianMutations();
  const [modalState, setModalState] = useState(null); // null | { mode: 'create' } | { mode: 'edit', jenis }
  const [toggleError, setToggleError] = useState('');

  async function handleToggleActive(jenis, isActive) {
    setToggleError('');
    try {
      await update.mutateAsync({ id: jenis.id, payload: { is_active: isActive } });
    } catch (err) {
      setToggleError(err.response?.data?.message || 'Gagal mengubah status');
    }
  }

  const columns = [
    {
      key: 'label',
      header: 'Nama Jenis',
      render: (j) => <span className="text-[13px] font-medium">{j.label}</span>,
    },
    {
      key: 'code',
      header: 'Kode',
      render: (j) => <span className="font-[var(--font-mono)] text-xs text-[var(--text-dim)]">{j.code}</span>,
    },
    {
      key: 'ketepatan',
      header: 'Ketepatan',
      render: (j) => <KetepatanNote counts={j.counts_in_ketepatan} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (j) => (
        <label className="flex cursor-pointer items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={j.is_active}
            onChange={(e) => handleToggleActive(j, e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          {j.is_active ? 'Aktif' : 'Nonaktif'}
        </label>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (j) => (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label={`Edit ${j.label}`}
          onClick={() => setModalState({ mode: 'edit', jenis: j })}
        >
          <Pencil size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <p className="m-0 text-xs text-[var(--text-faint)]">
          Jenis yang sudah dipakai riwayat tidak bisa dihapus, cukup dinonaktifkan.
        </p>
        <Button type="button" onClick={() => setModalState({ mode: 'create' })}>
          <Plus size={15} /> Tambah Jenis
        </Button>
      </div>

      {toggleError && (
        <div className="mb-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{toggleError}</div>
      )}

      <DataTable
        columns={columns}
        rows={all}
        getRowKey={(j) => j.id}
        isLoading={isLoading}
        emptyState={<EmptyState icon={Inbox} title="Belum ada jenis penggantian" />}
      />

      {modalState && (
        <JenisFormModal
          initial={modalState.mode === 'edit' ? modalState.jenis : null}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}

export default JenisPenggantianTab;
