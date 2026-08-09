// src/pages/PmPartHistoryPage.jsx
import { useState } from 'react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmPartHistoryList } from '../hooks/usePmPartHistory';
import { useLines } from '../hooks/useLines';
import Pagination from '../components/Pagination';
import OnTimeBadge from '../components/OnTimeBadge';

const LIMIT = 20;
const JENIS_LABEL = { TERJADWAL: 'Terjadwal', PM_EARLY: 'PM Early', BROKEN: 'Broken' };

function PmPartHistoryPage() {
  const [lineId, setLineId] = useState('');
  const [jenis, setJenis] = useState('');
  const [page, setPage] = useState(1);

  usePageHeader({ title: 'History PM Part' });

  const { data: lines = [] } = useLines({ isActive: true });
  const { data, isLoading, isError } = usePmPartHistoryList({
    line_id: lineId || undefined,
    jenis: jenis || undefined,
    page,
    limit: LIMIT,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
        {data && data.items.length === 0 && <div className="empty-state">Belum ada riwayat penggantian.</div>}

        {data && data.items.length > 0 && (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="mono">Tanggal</th>
                  <th>Line / Part</th>
                  <th className="mono">Shift</th>
                  <th className="mono">Counter</th>
                  <th>Jenis</th>
                  <th>PIC</th>
                  <th>Ketepatan</th>
                  <th>Remark</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.tgl_ganti}</td>
                    <td>
                      <div className="mono">{item.line_name}</div>
                      <div className="caption">
                        {item.part_name} ({item.drawing_no} — {item.jig_name})
                      </div>
                    </td>
                    <td className="mono">{item.shift || '-'}</td>
                    <td className="mono">{Number(item.counter_saat_diganti).toLocaleString('id-ID')}</td>
                    <td>{JENIS_LABEL[item.jenis_penggantian]}</td>
                    <td>{item.pic_name || '-'}</td>
                    <td>
                      <OnTimeBadge onTime={item.on_time} />
                    </td>
                    <td style={{ maxWidth: 200 }}>{item.remark || '-'}</td>
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

export default PmPartHistoryPage;