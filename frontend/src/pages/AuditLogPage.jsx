// src/pages/AuditLogPage.jsx
// New (docs/frontend/MIGRATION-PLAN.md Phase 11, docs/frontend/
// OPEN-QUESTIONS.md Resolved #2). Backend endpoint (GET /audit-log,
// Admin-only) sudah lengkap dari awal - fitur ini murni frontend, gak ada
// business logic baru yang ditambahkan. Satu backend fix menyertai (lihat
// auditLogQueries.js): kolom action_detail ditulis tapi belum pernah
// di-SELECT balik - dibenerin karena halaman ini butuh field itu.
//
// Ini satu-satunya tempat di Phase 7-11 yang PAKAI FilterBar (bukan cuma
// DataTable) - per keputusan Phase 6.5: FilterBar khusus buat surface
// yang genuinely baru, bukan migrasi tabel hand-rolled yang udah battle-
// tested (di situ toolbar custom lebih aman, lihat LinesTab/SuppliersTab).
// Di sini gak ada tabel lama yang dipertaruhkan - jadi FilterBar dipakai
// sesuai desainnya.
//
// Filter table_name/user_id/date_from/date_to semua SERVER-SIDE (backend
// sudah terima params ini, lihat auditLogController.js) - bukan
// ditambahkan di sini, cuma di-consume.
import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAuditLog } from '../hooks/useAuditLog';
import { useUsers } from '../hooks/useUsers';
import buildAuditLogColumns, { TABLE_NAME_LABEL } from './auditLogColumns';
import Modal from '../components/Modal';
import { FilterBar } from '../components/data-display/FilterBar';
import { DataTable, DataTableNoResult } from '../components/data-display/DataTable';
import { EmptyState } from '../components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const LIMIT = 20;

function DiffModal({ entry, onClose }) {
  return (
    <Modal title={`Detail Perubahan — ${TABLE_NAME_LABEL[entry.table_name] || entry.table_name} #${entry.record_id ?? '-'}`} onClose={onClose} width={640}>
      {entry.action_detail && (
        <p className="mb-3 text-[13px]">{entry.action_detail}</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {entry.old_value && (
          <div>
            <div className="mb-1 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">Sebelum</div>
            <pre className="max-h-[320px] overflow-auto rounded-lg border border-border bg-secondary p-3 text-xs">
              {JSON.stringify(entry.old_value, null, 2)}
            </pre>
          </div>
        )}
        {entry.new_value && (
          <div>
            <div className="mb-1 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">Sesudah</div>
            <pre className="max-h-[320px] overflow-auto rounded-lg border border-border bg-secondary p-3 text-xs">
              {JSON.stringify(entry.new_value, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
}

function AuditLogPage() {
  usePageHeader({ title: 'Audit Log' });

  const [tableName, setTableName] = useState('all');
  const [userId, setUserId] = useState('all');
  const [page, setPage] = useState(1);
  const [diffEntry, setDiffEntry] = useState(null);

  const { data: usersData } = useUsers({});
  const users = Array.isArray(usersData) ? usersData : usersData?.items || [];

  const params = {
    table_name: tableName === 'all' ? undefined : tableName,
    user_id: userId === 'all' ? undefined : userId,
    page,
    limit: LIMIT,
  };
  const { data, isLoading, isFetching, isError } = useAuditLog(params);

  const hasActiveFilter = tableName !== 'all' || userId !== 'all';

  function handleResetFilter() {
    setTableName('all');
    setUserId('all');
    setPage(1);
  }

  const columns = buildAuditLogColumns({ onViewDiff: setDiffEntry });

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <Select
          value={tableName}
          onValueChange={(v) => {
            setTableName(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]" aria-label="Filter berdasarkan Tabel">
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tabel</SelectItem>
            {Object.entries(TABLE_NAME_LABEL).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={userId}
          onValueChange={(v) => {
            setUserId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]" aria-label="Filter berdasarkan User">
            <SelectValue placeholder="Semua User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua User</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={data?.items}
        getRowKey={(a) => a.id}
        isLoading={isLoading && !data}
        isRefreshing={isFetching && !isLoading}
        isError={isError}
        page={data?.page}
        limit={data?.limit}
        total={data?.total}
        onPageChange={setPage}
        emptyState={
          hasActiveFilter ? (
            <DataTableNoResult onReset={handleResetFilter} />
          ) : (
            <EmptyState icon={Inbox} title="Belum ada aktivitas tercatat" />
          )
        }
      />

      {diffEntry && <DiffModal entry={diffEntry} onClose={() => setDiffEntry(null)} />}
    </div>
  );
}

export default AuditLogPage;
