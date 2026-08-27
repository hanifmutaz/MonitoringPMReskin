// src/pages/RecycleBinPage.jsx
// Halaman Recycle Bin (fitur baru) - ADMIN-ONLY (di-gate di App.jsx lewat
// ProtectedRoute allowedRoles={['Admin']}, sama pola dengan /settings &
// /users). Nampung 7 entity yang punya soft-delete (lihat
// recycleBinRegistry.js di backend) dalam bentuk tab, ngikutin pola
// MasterDataPage.jsx yang juga tab-based.
//
// Restore = reversible penuh (data balik ke tabel aktifnya). Permanent
// Delete = IRREVERSIBLE, makanya minta confirm dua kali (confirm() biasa +
// harus ketik ulang label datanya) supaya gak ke-klik gak sengaja.
//
// DataTable migration (docs/frontend/MIGRATION-PLAN.md Phase 11): hand-
// rolled <table> diganti data-display/DataTable dengan `selection` -
// semua item selectable di sini (gak ada kasus exclude-row kayak
// UserManagementPage), client-side (semua data Recycle Bin per-entity
// kebaca sekaligus di memori, sama pola LinesTab/SuppliersTab). Kolom (5)
// pindah ke recycleBinColumns.jsx. `RecycleBinBulkBar` (custom, BUKAN
// BulkDeleteBar generik - ada 2 aksi: Restore + Hapus Permanen) TIDAK
// disentuh, tetap page-level component di atas DataTable.
import { useState } from 'react';
import { Trash2, RotateCcw, Flame, X, Inbox } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import {
  useRecycleBinEntities,
  useDeletedItems,
  useRestoreMutation,
  usePermanentDeleteMutation,
  useBulkRestoreMutation,
  useBulkPermanentDeleteMutation,
} from '../hooks/useRecycleBin';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { useRowSelection } from '../hooks/useRowSelection';
import { cn } from '../lib/utils';
import buildRecycleBinColumns from './recycleBinColumns';
import { DataTable } from '../components/data-display/DataTable';
import { EmptyState } from '../components/ui/empty-state';
import { Button } from '../components/ui/button';

// Bar aksi massal Recycle Bin - beda dari BulkDeleteBar generik (yang cuma
// punya 1 tombol "Hapus") karena di sini ada DUA aksi yang mungkin: Restore
// Terpilih (reversible) dan Hapus Permanen Terpilih (IRREVERSIBLE). Dibikin
// khusus di sini (bukan dipaksa reuse BulkDeleteBar) daripada nambahin
// prop kedua yang cuma dipakai satu tempat.
function RecycleBinBulkBar({ count, onRestore, onPermanentDelete, onClear, restorePending, deletePending }) {
  if (count === 0) return null;

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--accent-dim)] bg-[var(--accent-dim)] px-3 py-2">
      <span className="text-[13px] font-medium text-primary">{count} data dipilih</span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="h-7" onClick={onClear} disabled={restorePending || deletePending}>
          <X size={13} /> Batal
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          onClick={onRestore}
          disabled={restorePending || deletePending}
        >
          <RotateCcw size={13} /> {restorePending ? 'Merestore...' : 'Restore Terpilih'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-7"
          onClick={onPermanentDelete}
          disabled={restorePending || deletePending}
        >
          <Flame size={13} /> {deletePending ? 'Menghapus...' : 'Hapus Permanen Terpilih'}
        </Button>
      </div>
    </div>
  );
}

function RecycleBinList({ entityKey }) {
  const { data: items = [], isLoading } = useDeletedItems(entityKey);
  const restore = useRestoreMutation(entityKey);
  const permanentDelete = usePermanentDeleteMutation(entityKey);
  const bulkRestore = useBulkRestoreMutation(entityKey);
  const bulkPermanentDelete = useBulkPermanentDeleteMutation(entityKey);
  const confirm = useConfirm();
  const [error, setError] = useState('');

  // Semua data di halaman Recycle Bin sekaligus kebaca di memori (bukan
  // server-paginated), jadi "select all" langsung nyakup semua row yang
  // lagi tampil - sama pola dengan LinesTab/SuppliersTab (client-side).
  const itemIds = items.map((i) => i.id);
  const selection = useRowSelection(itemIds);

  async function handleRestore(item) {
    setError('');
    try {
      await restore.mutateAsync(item.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal restore data');
    }
  }

  async function handlePermanentDelete(item) {
    if (
      !(await confirm(
        `Hapus PERMANEN "${item.label}"? Aksi ini TIDAK BISA dibatalkan/direstore lagi.`
      ))
    )
      return;
    setError('');
    try {
      await permanentDelete.mutateAsync(item.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus permanen');
    }
  }

  async function handleBulkRestore() {
    if (!(await confirm(`Restore ${selection.selectedCount} data terpilih ke tabel aktifnya?`))) return;
    setError('');
    try {
      const result = await bulkRestore.mutateAsync(selection.selectedIds);
      selection.clear();
      if (result?.skippedIds?.length) {
        setError(
          `${result.skippedIds.length} data dilewati (bentrok nama/kode dengan data aktif lain) - sisanya berhasil direstore.`
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal restore data terpilih');
    }
  }

  async function handleBulkPermanentDelete() {
    if (
      !(await confirm(
        `Hapus PERMANEN ${selection.selectedCount} data terpilih? Aksi ini TIDAK BISA dibatalkan/direstore lagi.`
      ))
    )
      return;
    setError('');
    try {
      const result = await bulkPermanentDelete.mutateAsync(selection.selectedIds);
      selection.clear();
      if (result?.skippedIds?.length) {
        setError(
          `${result.skippedIds.length} data dilewati (masih direferensikan data lain di sistem) - sisanya berhasil dihapus permanen.`
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menghapus permanen data terpilih');
    }
  }

  if (isLoading) return <div className="py-8 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>;

  const columns = buildRecycleBinColumns({
    onRestore: handleRestore,
    onPermanentDelete: handlePermanentDelete,
    restorePending: restore.isPending,
    deletePending: permanentDelete.isPending,
  });

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{error}</div>
      )}

      <RecycleBinBulkBar
        count={selection.selectedCount}
        onRestore={handleBulkRestore}
        onPermanentDelete={handleBulkPermanentDelete}
        onClear={selection.clear}
        restorePending={bulkRestore.isPending}
        deletePending={bulkPermanentDelete.isPending}
      />

      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(item) => item.id}
        selection={selection}
        emptyState={<EmptyState icon={Inbox} title="Recycle Bin kosong - belum ada data yang dihapus" />}
      />
    </div>
  );
}

function RecycleBinPage() {
  usePageHeader({ title: 'Recycle Bin' });
  const { data: entities = [] } = useRecycleBinEntities();
  const [activeEntity, setActiveEntity] = useState(null);

  const current = activeEntity || entities[0]?.key;

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Data yang dihapus (soft-delete) dari Master Data - masih bisa direstore. Hapus Permanen menghilangkan data
        selamanya, tidak bisa dibatalkan.
      </p>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {entities.map((e) => (
          <button
            key={e.key}
            type="button"
            onClick={() => setActiveEntity(e.key)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-t-md px-3 py-2 text-[13px] font-medium transition-colors',
              current === e.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-[var(--text-dim)] hover:bg-secondary'
            )}
          >
            <Trash2 size={13} />
            {e.label}
          </button>
        ))}
      </div>

      {current && <RecycleBinList key={current} entityKey={current} />}
    </div>
  );
}

export default RecycleBinPage;