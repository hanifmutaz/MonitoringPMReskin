// src/pages/PmLineStatusPage.jsx
// Reskin (checklist §3 item 6 "PM pages", batch 2/N): `.panel`/`.data-table`/
// `.error-state`/`.empty-state`/`.caption`/`.btn`/`.mono` lama dilepas
// total, diganti Tailwind + shadcn ui (Button), ngikutin pola tabel Master
// Data (rounded-lg border border-border, thead uppercase text-[var(--text-
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
import { useState } from 'react';
import { Plus, Inbox } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmLineStatus } from '../hooks/usePmLineStatus';
import buildPmLineColumns from '../components/pm-line/pmLineColumns';
import Banner from '../components/Banner';
import Modal from '../components/Modal';
import PmLineHistoryForm from '../components/pm-line/PmLineHistoryForm';
import { DataTable } from '../components/data-display/DataTable';
import { EmptyState } from '../components/ui/empty-state';
import { Button } from '../components/ui/button';

function PmLineStatusPage() {
  usePageHeader({ title: 'Monitoring PM Monthly and Weekly' });

  const { data, isLoading, isFetching, isError } = usePmLineStatus({});
  const [inputTarget, setInputTarget] = useState(null); // { line, jenisPm }
  // Modal "Input PM" TANPA preset - dipindah kesini dari menu Sidebar
  // (sebelumnya halaman /pm-line/form terpisah, diminta lewat chat). Form
  // yang sama otomatis nampilin dropdown pilih Line + jenis PM karena
  // presetLine kosong (lihat isPrefilled di PmLineHistoryForm).
  const [showInputForm, setShowInputForm] = useState(false);

  const columns = buildPmLineColumns({
    onInputMonthly: (line) => setInputTarget({ line, jenisPm: 'MONTHLY' }),
    onInputWeekly: (line) => setInputTarget({ line, jenisPm: 'WEEKLY' }),
  });

  return (
    <div className="flex flex-col gap-4">
      <Banner>
        Status Monthly maupun Weekly sama-sama dihitung dari akumulasi poin harian (Line yang tidak running di suatu
        hari tidak menambah poin, jadi sisa harinya tidak berkurang). Reset Monthly bisa ikut nge-reset Weekly
        tergantung setting <code className="font-[var(--font-mono)]">auto_reset_weekly_on_monthly</code>. Angka{' '}
        <strong>Ketepatan</strong> di bawah status menunjukkan persentase PM yang dilakukan sebelum/tepat waktu sejak
        awal tahun ini.
      </Banner>

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setShowInputForm(true)}>
          <Plus size={14} /> Input PM
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={data}
        getRowKey={(line) => line.line_id}
        isLoading={isLoading && !data}
        isRefreshing={isFetching && !isLoading}
        isError={isError}
        emptyState={<EmptyState icon={Inbox} title="Belum ada Line aktif" />}
      />

      {inputTarget && (
        <Modal
          title={`Input PM ${inputTarget.jenisPm === 'MONTHLY' ? 'Monthly' : 'Weekly'} — ${inputTarget.line.line_name}`}
          onClose={() => setInputTarget(null)}
        >
          <PmLineHistoryForm
            key={`${inputTarget.line.line_id}-${inputTarget.jenisPm}`}
            presetLine={inputTarget.line}
            presetJenisPm={inputTarget.jenisPm}
            onCancel={() => setInputTarget(null)}
            onSuccess={() => setInputTarget(null)}
          />
        </Modal>
      )}

      {showInputForm && (
        <Modal title="Input PM Monthly/Weekly" onClose={() => setShowInputForm(false)}>
          <PmLineHistoryForm onCancel={() => setShowInputForm(false)} onSuccess={() => setShowInputForm(false)} />
        </Modal>
      )}
    </div>
  );
}

export default PmLineStatusPage;