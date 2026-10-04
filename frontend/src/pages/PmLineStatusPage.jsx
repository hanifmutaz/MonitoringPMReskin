// src/pages/PmLineStatusPage.jsx
// Reskin (checklist §3 item 6 "PM pages", batch 2/N): `.panel`/`.data-table`/
// `.error-state`/`.empty-state`/`.caption`/`.btn`/`.mono` lama dilepas
// total, diganti Tailwind + shadcn ui (Button), ngikutin pola tabel Master
// Data (rounded-xl border border-border, thead uppercase text-[var(--text-
// faint)]). Data/logic (query, target input modal) TIDAK berubah sama
// sekali.
//
// Vertical slice migration (docs/frontend/MIGRATION-PLAN.md Phase 8): hand-
// rolled <table> diganti data-display/DataTable, mengikuti pola Phase 7
// (PmPartMonitoringPage.jsx). Filter & kolom cari (nama Line, Status
// Monthly, Status Weekly) ditambahkan belakangan dan jalan di SISI FRONTEND:
// semua Line aktif tetap diambil sekaligus (~150 baris, tanpa pagination -
// lihat usePmLineStatus.js, API-nya flat array bukan { items, total, page,
// limit }, dan pmLineRoutes.js cuma punya GET / tanpa query params), jadi
// tidak perlu endpoint/query baru. StatusWithKetepatan dan definisi 10 kolom pindah ke
// components/pm-line/pmLineColumns.jsx (domain/pm-line/ extraction, sama
// alasan Phase 7 mindahin buildPmPartColumns.jsx). Modal "Input PM"
// (dengan/tanpa preset Line), Banner penjelasan formula, dan query TIDAK
// disentuh.
import { useMemo, useState } from 'react';
import { Plus, X, Inbox } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmLineStatus } from '../hooks/usePmLineStatus';
import buildPmLineColumns from '../components/pm-line/pmLineColumns';
import Banner from '../components/Banner';
import PmLineHistoryForm from '../components/pm-line/PmLineHistoryForm';
import PmLineEditDateForm from '../components/pm-line/PmLineEditDateForm';
import { useAuth } from '../contexts/AuthContext';
import { DataTable, DataTableNoResult } from '../components/data-display/DataTable';
import { FilterBar } from '../components/data-display/FilterBar';
import SearchBar from '../components/SearchBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { EmptyState } from '../components/ui/empty-state';
import { Button } from '../components/ui/button';

const STATUS_OPTIONS = [
  { value: 'OK', label: 'OK' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'DANGER', label: 'Danger' },
];

// "line1", "Line 1", "LINE-1" semuanya cocok dengan "LINE-1" (sama dengan LineCombobox).
const normalize = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Belum dipilih ('all') -> tampil abu-abu seperti placeholder kolom cari
// ("Status Monthly"). Sudah dipilih -> "Monthly: Danger" supaya jelas ini filter
// yang mana. Isi dropdown cukup "Semua / OK / Warning / Danger" (tanpa prefix
// panjang yang bikin teks kepotong di kotak sempit).
function StatusSelect({ value, onChange, label, prefix }) {
  const selected = STATUS_OPTIONS.find((o) => o.value === value);
  return (
    <Select value={value === 'all' ? '' : value} onValueChange={onChange}>
      <SelectTrigger className="w-[190px]" aria-label={`Filter ${label}`}>
        <SelectValue placeholder={label}>{selected ? `${prefix}: ${selected.label}` : null}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Status</SelectItem>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PmLineStatusPage() {
  usePageHeader({ title: 'Monitoring PM Monthly and Weekly' });

  const { data, isLoading, isFetching, isError } = usePmLineStatus({});
  const { hasPermission } = useAuth();
  const canEditDate = hasPermission('pm_line.edit_date'); // efektifnya Admin ('*')
  // Input PM (tombol toolbar + ikon Monthly/Weekly per baris) butuh 'pm_line.submit'.
  const canSubmit = hasPermission('pm_line.submit');
  const [editDateTarget, setEditDateTarget] = useState(null); // { line, jenisPm }
  const [inputTarget, setInputTarget] = useState(null); // { line, jenisPm }
  // Modal "Input PM" TANPA preset - dipindah kesini dari menu Sidebar
  // (sebelumnya halaman /pm-line/form terpisah, diminta lewat chat). Form
  // yang sama otomatis nampilin dropdown pilih Line + jenis PM karena
  // presetLine kosong (lihat isPrefilled di PmLineHistoryForm).
  const [showInputForm, setShowInputForm] = useState(false);

  // Filter (client-side). 'all' = tidak difilter.
  const [search, setSearch] = useState('');
  const [statusMonthly, setStatusMonthly] = useState('all');
  const [statusWeekly, setStatusWeekly] = useState('all');
  const hasActiveFilter = Boolean(search) || statusMonthly !== 'all' || statusWeekly !== 'all';

  function handleResetFilter() {
    setSearch('');
    setStatusMonthly('all');
    setStatusWeekly('all');
  }

  // Urutan: jadwal PM terdekat di paling atas. Yang dipakai = sisa hari
  // terkecil antara Monthly dan Weekly (negatif = sudah lewat jadwal).
  // Sisa hari kosong (null = belum pernah PM, statusnya otomatis DANGER)
  // dianggap paling mendesak, jadi ikut di paling atas. Sama rata ->
  // urut nama Line. Data Line sedikit & tidak dipaginasi, jadi cukup
  // diurutkan di sini (endpoint yang sama juga dipakai Dashboard, sengaja
  // tidak diubah urutannya).
  const sortedLines = useMemo(() => {
    if (!data) return data;
    const urgency = (line) => {
      const monthly = line.sisa_hari_monthly ?? -Infinity;
      const weekly = line.sisa_hari_weekly ?? -Infinity;
      return Math.min(monthly, weekly);
    };
    return [...data].sort((a, b) => {
      const ua = urgency(a);
      const ub = urgency(b);
      if (ua !== ub) return ua < ub ? -1 : 1;
      return String(a.line_name).localeCompare(String(b.line_name), undefined, { numeric: true });
    });
  }, [data]);

  // Urutan hasil filter ikut sortedLines (jadwal paling mendesak di atas).
  const filteredLines = useMemo(() => {
    if (!sortedLines) return sortedLines;
    const q = normalize(search);
    return sortedLines.filter(
      (line) =>
        (!q || normalize(line.line_name).includes(q)) &&
        (statusMonthly === 'all' || line.status_monthly === statusMonthly) &&
        (statusWeekly === 'all' || line.status_weekly === statusWeekly)
    );
  }, [sortedLines, search, statusMonthly, statusWeekly]);

  const columns = buildPmLineColumns({
    onInputMonthly: (line) => setInputTarget({ line, jenisPm: 'MONTHLY' }),
    onInputWeekly: (line) => setInputTarget({ line, jenisPm: 'WEEKLY' }),
    canSubmit,
    canEditDate,
    onEditMonthlyDate: (line) => setEditDateTarget({ line, jenisPm: 'MONTHLY' }),
    onEditWeeklyDate: (line) => setEditDateTarget({ line, jenisPm: 'WEEKLY' }),
  });

  // BUGFIX (iPad): form "Input PM" sebelumnya dibuka via Modal (Dialog)
  // yang overlay-nya ga kebentuk bener di viewport iPad (lihat laporan -
  // background gelap kepotong / form nyangkut di tengah). Diganti jadi
  // inline form (toggle di halaman, sama persis pola PmLineHistoryPage.jsx
  // - tombol "+ Input PM" <-> "Tutup Form"), bukan overlay lagi sama
  // sekali. Berlaku baik buat form kosong (tombol atas) maupun form preset
  // per-Line (link "Input Monthly"/"Input Weekly" di kolom tabel).
  const anyFormOpen = Boolean(inputTarget) || showInputForm;

  function closeAllForms() {
    setInputTarget(null);
    setShowInputForm(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Banner>
        Status Monthly maupun Weekly sama-sama dihitung dari akumulasi poin harian (Line yang tidak running di suatu
        hari tidak menambah poin, jadi sisa harinya tidak berkurang). Reset Monthly bisa ikut nge-reset Weekly
        tergantung setting <code className="font-[var(--font-mono)]">auto_reset_weekly_on_monthly</code>. Angka{' '}
        <strong>Ketepatan</strong> di bawah status menunjukkan persentase PM yang dilakukan sebelum/tepat waktu sejak
        awal tahun ini.
      </Banner>

      {canSubmit && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => (anyFormOpen ? closeAllForms() : setShowInputForm(true))}
          >
            {anyFormOpen ? (
              <>
                <X size={14} /> Tutup Form
              </>
            ) : (
              <>
                <Plus size={14} /> Input PM
              </>
            )}
          </Button>
        </div>
      )}

      {showInputForm && <PmLineHistoryForm onCancel={closeAllForms} onSuccess={closeAllForms} />}

      {inputTarget && (
        <div className="rounded-xl border border-border bg-card p-4.5">
          <div className="mb-4">
            <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">
              Input PM {inputTarget.jenisPm === 'MONTHLY' ? 'Monthly' : 'Weekly'} {inputTarget.line.line_name}
            </h2>
          </div>
          <PmLineHistoryForm
            key={`${inputTarget.line.line_id}-${inputTarget.jenisPm}`}
            presetLine={inputTarget.line}
            presetJenisPm={inputTarget.jenisPm}
            onCancel={closeAllForms}
            onSuccess={closeAllForms}
          />
        </div>
      )}

      {editDateTarget && (
        <PmLineEditDateForm
          key={`${editDateTarget.line.line_id}-${editDateTarget.jenisPm}`}
          line={editDateTarget.line}
          jenisPm={editDateTarget.jenisPm}
          onCancel={() => setEditDateTarget(null)}
          onSuccess={() => setEditDateTarget(null)}
        />
      )}

      <FilterBar
        actions={
          data ? (
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {hasActiveFilter ? `${filteredLines.length} dari ${data.length} Line` : `${data.length} Line`}
            </span>
          ) : undefined
        }
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Cari nama Line..." />
        <StatusSelect value={statusMonthly} onChange={setStatusMonthly} label="Status Monthly" prefix="Monthly" />
        <StatusSelect value={statusWeekly} onChange={setStatusWeekly} label="Status Weekly" prefix="Weekly" />
        {hasActiveFilter && (
          <Button type="button" variant="ghost" size="sm" onClick={handleResetFilter}>
            <X size={14} /> Reset
          </Button>
        )}
      </FilterBar>

      <DataTable
        wrapHeaders
        columns={columns}
        rows={filteredLines}
        getRowKey={(line) => line.line_id}
        isLoading={isLoading && !data}
        isRefreshing={isFetching && !isLoading}
        isError={isError}
        emptyState={
          hasActiveFilter ? (
            <DataTableNoResult description="Tidak ada Line yang cocok dengan pencarian/filter." onReset={handleResetFilter} />
          ) : (
            <EmptyState icon={Inbox} title="Belum ada Line aktif" />
          )
        }
      />
    </div>
  );
}

export default PmLineStatusPage;
