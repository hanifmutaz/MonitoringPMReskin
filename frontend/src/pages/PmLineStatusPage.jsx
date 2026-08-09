// src/pages/PmLineStatusPage.jsx
import { useState } from 'react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmLineStatus } from '../hooks/usePmLineStatus';
import StatusBadge from '../components/StatusBadge';
import Banner from '../components/Banner';
import Modal from '../components/Modal';
import PmLineHistoryForm from '../components/PmLineHistoryForm';

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
      <div className="caption" style={{ marginTop: 4 }}>
        {formatKetepatan(percentage)}
      </div>
    </div>
  );
}

function PmLineStatusPage() {
  usePageHeader({ title: 'Monitoring PM Monthly and Weekly' });

  const { data, isLoading, isError } = usePmLineStatus({});
  const [inputTarget, setInputTarget] = useState(null); // { line, jenisPm }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Banner>
        Status Monthly dihitung dari akumulasi poin (cap 30), status Weekly murni hitung mundur kalender 7 hari.
        Reset Monthly bisa ikut nge-reset Weekly tergantung setting <code className="mono">auto_reset_weekly_on_monthly</code>.
        Angka <strong>Ketepatan</strong> di bawah status menunjukkan persentase PM yang dilakukan sebelum/tepat waktu
        sejak awal tahun ini.
      </Banner>

      <div className="panel">
        {isError && <div className="error-state">Gagal memuat status Line. Coba lagi.</div>}
        {isLoading && <div className="empty-state">Memuat data...</div>}
        {data && data.length === 0 && <div className="empty-state">Belum ada Line aktif.</div>}

        {data && data.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Line</th>
                <th className="mono">Tgl Monthly Terakhir</th>
                <th className="mono">Poin</th>
                <th className="mono">Sisa Hari Monthly</th>
                <th>Status Monthly</th>
                <th className="mono">Tgl Weekly Terakhir</th>
                <th className="mono">Sisa Hari Weekly</th>
                <th>Status Weekly</th>
                <th style={{ width: 200 }}></th>
              </tr>
            </thead>
            <tbody>
              {data.map((line) => (
                <tr key={line.line_id}>
                  <td className="mono">{line.line_name}</td>
                  <td className="mono">{line.tgl_pm_monthly_terakhir || '-'}</td>
                  <td className="mono">{line.akumulasi_poin_monthly}</td>
                  <td className="mono">{line.sisa_hari_monthly ?? '-'}</td>
                  <td>
                    <StatusWithKetepatan status={line.status_monthly} percentage={line.ketepatan_monthly_percentage} />
                  </td>
                  <td className="mono">{line.tgl_pm_weekly_terakhir || '-'}</td>
                  <td className="mono">{line.sisa_hari_weekly ?? '-'}</td>
                  <td>
                    <StatusWithKetepatan status={line.status_weekly} percentage={line.ketepatan_weekly_percentage} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => setInputTarget({ line, jenisPm: 'MONTHLY' })}
                      >
                        Input Monthly
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => setInputTarget({ line, jenisPm: 'WEEKLY' })}
                      >
                        Input Weekly
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}

export default PmLineStatusPage;