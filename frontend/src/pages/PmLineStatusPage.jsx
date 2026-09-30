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
// (PmPartMonitoringPage.jsx). Tidak ada FilterBar di sini - halaman ini
// sengaja tidak punya filter/search sama sekali (semua Line aktif
// ditampilkan sekaligus, ~150 baris, tanpa pagination - lihat
// usePmLineStatus.js, API-nya memang flat array bukan { items, total,
// page, limit }, konsisten dengan pmLineRoutes.js yang cuma punya GET /
// tanpa query params). StatusWithKetepatan dan definisi 10 kolom pindah ke
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
import { DataTable } from '../components/data-display/DataTable';
import { EmptyState } from '../components/ui/empty-state';
import { Button } from '../components/ui/button';

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

      <DataTable
        wrapHeaders
        columns={columns}
        rows={sortedLines}
        getRowKey={(line) => line.line_id}
        isLoading={isLoading && !data}
        isRefreshing={isFetching && !isLoading}
        isError={isError}
        emptyState={<EmptyState icon={Inbox} title="Belum ada Line aktif" />}
      />
    </div>
  );
}

export default PmLineStatusPage;
