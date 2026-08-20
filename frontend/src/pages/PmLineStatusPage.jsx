// src/pages/PmLineStatusPage.jsx
// Reskin (checklist §3 item 6 "PM pages", batch 2/N): `.panel`/`.data-table`/
// `.error-state`/`.empty-state`/`.caption`/`.btn`/`.mono` lama dilepas
// total, diganti Tailwind + shadcn ui (Button), ngikutin pola tabel Master
// Data (rounded-lg border border-border, thead uppercase text-[var(--text-
// faint)]). Data/logic (query, target input modal) TIDAK berubah sama
// sekali.
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmLineStatus } from '../hooks/usePmLineStatus';
import StatusBadge from '../components/StatusBadge';
import Banner from '../components/Banner';
import Modal from '../components/Modal';
import PmLineHistoryForm from '../components/PmLineHistoryForm';
import { Button } from '../components/ui/button';

function formatKetepatan(percentage) {
  return percentage === null || percentage === undefined ? 'belum ada data' : `Ketepatan ${percentage}%`;
}

// Status + Ketepatan digabung 1 cell (badge di atas, caption kecil di bawah)
// - sebelumnya 2 kolom terpisah bikin tabel ini kepenuhan (11 kolom total)
// padahal dua-duanya ngomongin hal yang berkaitan buat 1 jenis PM yang sama.
function StatusWithKetepatan({ status, percentage }) {
  return (
    <div>
      <StatusBadge status={status} />
      <div className="mt-1 text-xs text-muted-foreground">{formatKetepatan(percentage)}</div>
    </div>
  );
}

function PmLineStatusPage() {
  usePageHeader({ title: 'Monitoring PM Monthly and Weekly' });

  const { data, isLoading, isError } = usePmLineStatus({});
  const [inputTarget, setInputTarget] = useState(null); // { line, jenisPm }
  // Modal "Input PM" TANPA preset - dipindah kesini dari menu Sidebar
  // (sebelumnya halaman /pm-line/form terpisah, diminta lewat chat). Form
  // yang sama otomatis nampilin dropdown pilih Line + jenis PM karena
  // presetLine kosong (lihat isPrefilled di PmLineHistoryForm).
  const [showInputForm, setShowInputForm] = useState(false);

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

      <div className="rounded-lg border border-border bg-card p-4.5">
        {isError && (
          <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
            Gagal memuat status Line. Coba lagi.
          </div>
        )}
        {isLoading && <div className="py-8 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>}
        {data && data.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--text-faint)]">Belum ada Line aktif.</div>
        )}

        {data && data.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      'Line',
                      'Tgl Monthly Terakhir',
                      'Poin',
                      'Sisa Hari Monthly',
                      'Status Monthly',
                      'Tgl Weekly Terakhir',
                      'Poin',
                      'Sisa Hari Weekly',
                      'Status Weekly',
                      '',
                    ].map((h, i) => (
                      <th
                        key={i}
                        className="whitespace-nowrap px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((line) => (
                    <tr key={line.line_id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                      <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{line.line_name}</td>
                      <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">
                        {line.tgl_pm_monthly_terakhir || '-'}
                      </td>
                      <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{line.akumulasi_poin_monthly}</td>
                      <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{line.sisa_hari_monthly ?? '-'}</td>
                      <td className="px-3 py-3">
                        <StatusWithKetepatan status={line.status_monthly} percentage={line.ketepatan_monthly_percentage} />
                      </td>
                      <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">
                        {line.tgl_pm_weekly_terakhir || '-'}
                      </td>
                      <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{line.akumulasi_poin_weekly}</td>
                      <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{line.sisa_hari_weekly ?? '-'}</td>
                      <td className="px-3 py-3">
                        <StatusWithKetepatan status={line.status_weekly} percentage={line.ketepatan_weekly_percentage} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5">
                          <Button type="button" size="sm" variant="outline" onClick={() => setInputTarget({ line, jenisPm: 'MONTHLY' })}>
                            Input Monthly
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setInputTarget({ line, jenisPm: 'WEEKLY' })}>
                            Input Weekly
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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