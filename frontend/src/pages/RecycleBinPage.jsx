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
import { useState } from 'react';
import { Trash2, RotateCcw, Flame } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import {
  useRecycleBinEntities,
  useDeletedItems,
  useRestoreMutation,
  usePermanentDeleteMutation,
} from '../hooks/useRecycleBin';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';

function RecycleBinList({ entityKey }) {
  const { data: items = [], isLoading } = useDeletedItems(entityKey);
  const restore = useRestoreMutation(entityKey);
  const permanentDelete = usePermanentDeleteMutation(entityKey);
  const confirm = useConfirm();
  const [error, setError] = useState('');

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

  if (isLoading) return <div className="py-8 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>;

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-faint)]">
        Recycle Bin kosong - belum ada data yang dihapus.
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{error}</div>
      )}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {['Data', 'Konteks', 'Dihapus Pada', 'Dihapus Oleh', 'Aksi'].map((h) => (
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
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                  <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{item.label}</td>
                  <td className="px-3 py-3 text-xs text-[var(--text-dim)]">{item.context || '-'}</td>
                  <td className="px-3 py-3 font-[var(--font-mono)] text-xs text-[var(--text-dim)]">
                    {new Date(item.deleted_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-3 text-xs text-[var(--text-dim)]">{item.deleted_by_name || '-'}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7"
                        onClick={() => handleRestore(item)}
                        disabled={restore.isPending}
                        title="Restore"
                      >
                        <RotateCcw size={13} /> Restore
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handlePermanentDelete(item)}
                        disabled={permanentDelete.isPending}
                        title="Hapus Permanen"
                      >
                        <Flame size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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