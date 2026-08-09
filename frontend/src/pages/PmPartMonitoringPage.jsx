// src/pages/PmPartMonitoringPage.jsx
import { useState } from 'react';
import { Truck } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmPartList, usePmPartKetepatanPerLine } from '../hooks/usePmPartList';
import { useLines } from '../hooks/useLines';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import WearRing from '../components/WearRing';
import StatusBadge from '../components/StatusBadge';
import StatusFilterPills from '../components/StatusFilterPills';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import PmPartHistoryForm from '../components/PmPartHistoryForm';

const LIMIT = 20;

function ketepatanColor(percentage) {
  if (percentage === null || percentage === undefined) return 'var(--text-faint)';
  if (percentage >= 90) return 'var(--ok)';
  if (percentage >= 50) return 'var(--warn)';
  return 'var(--danger)';
}

// Mini-card per Line (bukan chip "Line X: 92%" seperti sebelumnya) - pola
// chip inline gak konsisten sama badge lain di app ini (badge di sini
// selalu [dot + 1 kata status], bukan [label: value]). Kartu kecil lebih
// gampang di-scan sekilas dan null-state-nya jelas beda warna (abu-abu,
// bukan hijau seolah "bagus").
function KetepatanPerLinePanel() {
  const { data, isLoading } = usePmPartKetepatanPerLine();

  if (isLoading || !data || data.length === 0) return null;

  return (
    <div className="panel" style={{ padding: '12px 16px' }}>
      <div className="caption" style={{ marginBottom: 10 }}>
        Ketepatan PM Part per Line (tahun berjalan)
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {data.map((l) => (
          <div
            key={l.line_id}
            style={{
              background: 'var(--panel-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              minWidth: 120,
            }}
          >
            <div className="kpi-label">{l.line_name}</div>
            <div className="kpi-value" style={{ color: ketepatanColor(l.percentage), fontSize: 22 }}>
              {l.percentage === null ? '-' : `${l.percentage}%`}
            </div>
            <div className="kpi-caption">{l.percentage === null ? 'belum ada data' : `${l.total} event`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PmPartMonitoringPage() {
  usePageHeader({ title: 'Monitoring PM Part' });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [lineId, setLineId] = useState('');
  const [page, setPage] = useState(1);
  const [gantiPartItem, setGantiPartItem] = useState(null);

  const debouncedSearch = useDebouncedValue(search);
  const { data: lines = [] } = useLines({ isActive: true });

  const { data, isLoading, isError } = usePmPartList({
    search: debouncedSearch || undefined,
    status: status || undefined,
    line_id: lineId || undefined,
    page,
    limit: LIMIT,
  });

  function handleFilterChange(setter) {
    return (val) => {
      setter(val);
      setPage(1);
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <KetepatanPerLinePanel />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={handleFilterChange(setSearch)} placeholder="Cari drawing no / nama part..." />

        <select
          className="form-select"
          value={lineId}
          onChange={(e) => handleFilterChange(setLineId)(e.target.value)}
        >
          <option value="">Semua Line</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.line_name}
            </option>
          ))}
        </select>

        <StatusFilterPills value={status} onChange={handleFilterChange(setStatus)} />
      </div>

      <div className="panel">
        {isError && <div className="error-state">Gagal memuat data. Coba lagi.</div>}

        {isLoading && !data && <div className="empty-state">Memuat data...</div>}

        {data && data.items.length === 0 && (
          <div className="empty-state">Belum ada part yang cocok dengan filter ini.</div>
        )}

        {data && data.items.length > 0 && (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}></th>
                  <th>Line</th>
                  <th>Drawing No / Part Name</th>
                  <th className="mono">Counter</th>
                  <th className="mono">Target Shot</th>
                  <th className="mono">Sisa Shot</th>
                  <th className="mono">Estimasi PM</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.part_id}>
                    <td>
                      <WearRing percentage={item.wear_percentage} status={item.status} />
                    </td>
                    <td className="mono">{item.line_name}</td>
                    <td>
                      <div>{item.part_name}</div>
                      <div className="caption mono">
                        {item.drawing_no} <span className="caption">({item.jig_name})</span>
                      </div>
                      {item.primary_supplier_name ? (
                        <div className="caption" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Truck size={11} /> {item.primary_supplier_name}
                        </div>
                      ) : (
                        <div className="caption" style={{ color: 'var(--text-faint)', marginTop: 2 }}>
                          Belum ada Supplier utama
                        </div>
                      )}
                    </td>
                    <td className="mono">{item.counter.toLocaleString('id-ID')}</td>
                    <td className="mono">{item.target_shot.toLocaleString('id-ID')}</td>
                    <td className="mono">{item.remaining_shot.toLocaleString('id-ID')}</td>
                    <td className="mono">{item.estimated_pm_date || '-'}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 12px', fontSize: 12 }}
                        onClick={() => setGantiPartItem(item)}
                      >
                        Ganti Part
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />
          </>
        )}
      </div>

      {gantiPartItem && (
        <Modal title={`Ganti Part — ${gantiPartItem.drawing_no}`} onClose={() => setGantiPartItem(null)}>
          <PmPartHistoryForm
            key={gantiPartItem.part_id}
            presetPart={gantiPartItem}
            onCancel={() => setGantiPartItem(null)}
            onSuccess={() => setGantiPartItem(null)}
          />
        </Modal>
      )}
    </div>
  );
}

export default PmPartMonitoringPage;