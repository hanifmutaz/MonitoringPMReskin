// src/pages/PmLineHistoryPage.jsx
// Reskin (checklist §3 item 6 "PM pages", batch 3/N): `.btn`/`.form-select`/
// `.panel`/`.data-table`/`.error-state`/`.empty-state`/`.mono`/inline style
// lama dilepas total, diganti Tailwind + shadcn ui (Button/Select).
// Tombol "Input PM" ini yang dimaksud catatan di Topbar.jsx ("actions slot
// sengaja gak disentuh, kebagian pas reskin halaman itu sendiri") - sekarang
// kebagian gilirannya. Filter Line/Jenis tetap SERVER-SIDE (gak diubah).
// Data/logic (query, pagination, toggle form) TIDAK berubah sama sekali.
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmLineHistoryList } from '../hooks/usePmLineHistory';
import { useLines } from '../hooks/useLines';
import { useRowSelection } from '../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../hooks/useRecycleBin';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { fetchPmLineHistoryList } from '../api/pmLineHistoryApi';
import PmLineHistoryForm from '../components/PmLineHistoryForm';
import Pagination from '../components/Pagination';
import OnTimeBadge from '../components/OnTimeBadge';
import BulkDeleteBar from '../components/BulkDeleteBar';
import SelectAllAcrossPagesBar from '../components/SelectAllAcrossPagesBar';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const LIMIT = 20;
const JENIS_LABEL = { MONTHLY: 'Monthly', WEEKLY: 'Weekly' };

function PmLineHistoryPage() {
  const [showForm, setShowForm] = useState(false);
  const [lineId, setLineId] = useState('all');
  const [jenis, setJenis] = useState('all');
  const [page, setPage] = useState(1);
  const [bulkError, setBulkError] = useState('');
  const confirm = useConfirm();

  usePageHeader({
    title: 'History PM Line',
    actions: (
      <Button type="button" onClick={() => setShowForm((v) => !v)}>
        {showForm ? (
          <>
            <X size={14} /> Tutup Form
          </>
        ) : (
          <>
            <Plus size={14} /> Input PM
          </>
        )}
      </Button>
    ),
  });

  const { data: lines = [] } = useLines({ isActive: true });
  const params = {
    line_id: lineId === 'all' ? undefined : lineId,
    jenis: jenis === 'all' ? undefined : jenis,
    page,
    limit: LIMIT,
  };
  const { data, isLoading, isError } = usePmLineHistoryList(params);
  const pageIds = data?.items?.map((h) => h.id) ?? [];
  const selection = useRowSelection(pageIds);
  // Entity registry-nya 'pm-line-history' (lihat recycleBinRegistry.js) -
  // dipakai sama query key react-query yang di-invalidate abis bulk-delete
  // (lihat ENTITY_QUERY_KEYS di useRecycleBin.js: ikut nyegerin ['pm-line']
  // & ['dashboard'] juga, soalnya status ketepatan PM dihitung live dari
  // tabel ini - ADR 006).
  const bulkDelete = useBulkDeleteMutation('pm-line-history');

  // "Pilih semua N riwayat yang cocok filter" - pola sama dengan PartsTab
  // (server-side paginated), nembak ulang endpoint yang sama dgn
  // limit=total buat ambil semua id yang cocok filter aktif.
  async function handleSelectAllMatching() {
    const all = await fetchPmLineHistoryList({ ...params, page: 1, limit: data.total });
    selection.selectIds(all.items.map((h) => h.id));
  }

  async function handleBulkDelete() {
    if (
      !(await confirm(
        `Hapus ${selection.selectedCount} riwayat PM Line terpilih? Bisa direstore lewat Recycle Bin. Status ketepatan PM akan otomatis dihitung ulang tanpa data ini.`
      ))
    )
      return;
    setBulkError('');
    try {
      await bulkDelete.mutateAsync(selection.selectedIds);
      selection.clear();
    } catch (err) {
      setBulkError(err.response?.data?.message || 'Gagal menghapus riwayat terpilih');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm && (
        <PmLineHistoryForm
          onSuccess={() => {
            setShowForm(false);
            setPage(1);
          }}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Select
          value={lineId}
          onValueChange={(v) => {
            setLineId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[220px]">
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

        <Select
          value={jenis}
          onValueChange={(v) => {
            setJenis(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            {Object.entries(JENIS_LABEL).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card p-4.5">
        {isError && (
          <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
            Gagal memuat riwayat. Coba lagi.
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
          label="Riwayat"
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
          <div className="py-8 text-center text-sm text-[var(--text-faint)]">Belum ada riwayat PM Line.</div>
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
                      {['Tanggal', 'Line', 'Jenis', 'PIC', 'Ketepatan', 'Keterangan', 'Oleh'].map((h) => (
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
                    {data.items.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selection.isSelected(item.id)}
                            onChange={() => selection.toggle(item.id)}
                            className="h-3.5 w-3.5 accent-[var(--accent)]"
                          />
                        </td>
                        <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{item.tgl_input}</td>
                        <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{item.line_name}</td>
                        <td className="px-3 py-3 text-[13px]">{JENIS_LABEL[item.jenis_pm]}</td>
                        <td className="px-3 py-3 text-[13px]">{item.pic_name || '-'}</td>
                        <td className="px-3 py-3">
                          <OnTimeBadge onTime={item.on_time} />
                        </td>
                        <td className="max-w-[240px] px-3 py-3 text-xs text-[var(--text-dim)]">{item.keterangan || '-'}</td>
                        <td className="px-3 py-3 text-xs text-[var(--text-dim)]">{item.user_full_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

export default PmLineHistoryPage;
