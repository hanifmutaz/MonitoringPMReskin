// src/pages/PmLineHistoryPage.jsx
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmLineHistoryList } from '../hooks/usePmLineHistory';
import { useLines } from '../hooks/useLines';
import PmLineHistoryForm from '../components/PmLineHistoryForm';
import Pagination from '../components/Pagination';
import OnTimeBadge from '../components/OnTimeBadge';

const LIMIT = 20;
const JENIS_LABEL = { MONTHLY: 'Monthly', WEEKLY: 'Weekly' };

function PmLineHistoryPage() {
  const [showForm, setShowForm] = useState(false);
  const [lineId, setLineId] = useState('');
  const [jenis, setJenis] = useState('');
  const [page, setPage] = useState(1);

  usePageHeader({
    title: 'History PM Line',
    actions: (
      <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
        {showForm ? (
          <>
            <X size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Tutup Form
          </>
        ) : (
          <>
            <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Input PM
          </>
        )}
      </button>
    ),
  });

  const { data: lines = [] } = useLines({ isActive: true });
  const { data, isLoading, isError } = usePmLineHistoryList({
    line_id: lineId || undefined,
    jenis: jenis || undefined,
    page,
    limit: LIMIT,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {showForm && (
        <PmLineHistoryForm
          onSuccess={() => {
            setShowForm(false);
            setPage(1);
          }}
        />
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <select
          className="form-select"
          value={lineId}
          onChange={(e) => {
            setLineId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Line</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.line_name}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={jenis}
          onChange={(e) => {
            setJenis(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Jenis</option>
          {Object.entries(JENIS_LABEL).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="panel">
        {isError && <div className="error-state">Gagal memuat riwayat. Coba lagi.</div>}
        {isLoading && !data && <div className="empty-state">Memuat data...</div>}
        {data && data.items.length === 0 && <div className="empty-state">Belum ada riwayat PM Line.</div>}

        {data && data.items.length > 0 && (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="mono">Tanggal</th>
                  <th>Line</th>
                  <th>Jenis</th>
                  <th>PIC</th>
                  <th>Ketepatan</th>
                  <th>Keterangan</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.tgl_input}</td>
                    <td className="mono">{item.line_name}</td>
                    <td>{JENIS_LABEL[item.jenis_pm]}</td>
                    <td>{item.pic_name || '-'}</td>
                    <td>
                      <OnTimeBadge onTime={item.on_time} />
                    </td>
                    <td style={{ maxWidth: 240 }}>{item.keterangan || '-'}</td>
                    <td>{item.user_full_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

export default PmLineHistoryPage;