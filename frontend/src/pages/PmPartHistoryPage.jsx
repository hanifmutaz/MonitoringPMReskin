// src/pages/PmPartHistoryPage.jsx
// Reskin (checklist §3 item 5 "PM Part & PM Monthly/Weekly", batch susulan -
// menyusul PmLineHistoryPage.jsx yang jadi pattern acuan): `.form-select`/
// `.panel`/`.data-table`/`.error-state`/`.empty-state`/`.mono`/`.caption`/
// inline style lama dilepas total, diganti Tailwind + shadcn ui (Select).
// Data/logic (query, filter, pagination) TIDAK berubah sama sekali.
import { useState } from 'react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmPartHistoryList } from '../hooks/usePmPartHistory';
import { useLines } from '../hooks/useLines';
import { useRowSelection } from '../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../hooks/useRecycleBin';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { fetchPmPartHistoryList } from '../api/pmPartHistoryApi';
import Pagination from '../components/Pagination';
import OnTimeBadge from '../components/OnTimeBadge';
import BulkDeleteBar from '../components/BulkDeleteBar';
import SelectAllAcrossPagesBar from '../components/SelectAllAcrossPagesBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { JENIS_LABEL } from '../components/pm-part/constants';

const LIMIT = 20;

function PmPartHistoryPage() {
  const [lineId, setLineId] = useState('all');
  const [jenis, setJenis] = useState('all');
  const [page, setPage] = useState(1);
  const [bulkError, setBulkError] = useState('');
  const confirm = useConfirm();

  usePageHeader({ title: 'History PM Part' });

  const { data: lines = [] } = useLines({ isActive: true });
  const params = {
    line_id: lineId === 'all' ? undefined : lineId,
    jenis: jenis === 'all' ? undefined : jenis,
    page,
    limit: LIMIT,
  };
  const { data, isLoading, isError } = usePmPartHistoryList(params);
  const pageIds = data?.items?.map((h) => h.id) ?? [];
  const selection = useRowSelection(pageIds);
  // 'pm-part-history' - entity ini yang PALING KRITIS di antara 3 tabel
  // history: counter wear part dihitung LIVE dari MAX(tgl_ganti) tabel ini
  // (COUNTER_CTE di pmPartQueries.js, filter deleted_at IS NULL sudah
  // ditambahin di query-nya) - jadi hapus riwayat penggantian di sini bisa
  // langsung ngubah status "sudah waktunya ganti" part terkait. Wajar
  // dipakai buat testing (itu memang tujuannya), tapi Admin perlu ngerti
  // efek sampingnya - makanya dikasih peringatan eksplisit di confirm().
  const bulkDelete = useBulkDeleteMutation('pm-part-history');

  async function handleSelectAllMatching() {
    const all = await fetchPmPartHistoryList({ ...params, page: 1, limit: data.total });
    selection.selectIds(all.items.map((h) => h.id));
  }

  async function handleBulkDelete() {
    if (
      !(await confirm(
        `Hapus ${selection.selectedCount} riwayat penggantian part terpilih? Bisa direstore lewat Recycle Bin. PERHATIAN: counter wear part dihitung dari tanggal ganti terakhir di riwayat ini - menghapus riwayat bisa mengubah status "waktu ganti" part terkait.`
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
          <div className="py-8 text-center text-sm text-[var(--text-faint)]">Belum ada riwayat penggantian.</div>
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
                      {['Tanggal', 'Line / Part', 'Shift', 'Counter', 'Jenis', 'PIC', 'Ketepatan', 'Remark', 'Oleh'].map(
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
                        <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{item.tgl_ganti}</td>
                        <td className="px-3 py-3">
                          <div className="font-[var(--font-mono)] text-[13px]">{item.line_name}</div>
                          <div className="text-xs text-[var(--text-dim)]">
                            {item.part_name} ({item.drawing_no} — {item.jig_name})
                          </div>
                        </td>
                        <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{item.shift || '-'}</td>
                        <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">
                          {Number(item.counter_saat_diganti).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-3 text-[13px]">{JENIS_LABEL[item.jenis_penggantian]}</td>
                        <td className="px-3 py-3 text-[13px]">{item.pic_name || '-'}</td>
                        <td className="px-3 py-3">
                          <OnTimeBadge onTime={item.on_time} />
                        </td>
                        <td className="max-w-[200px] px-3 py-3 text-xs text-[var(--text-dim)]">{item.remark || '-'}</td>
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

export default PmPartHistoryPage;