// src/components/PmPartHistoryForm.jsx
import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { useLines } from '../hooks/useLines';
import { useParts } from '../hooks/useParts';
import { useCreatePmPartHistory } from '../hooks/usePmPartHistory';
import { lookupPartsByDrawingNo } from '../api/partsApi';
import BarcodeScannerModal from './BarcodeScannerModal';

const JENIS_OPTIONS = [
  { value: 'TERJADWAL', label: 'Terjadwal' },
  { value: 'PM_EARLY', label: 'PM Early' },
  { value: 'BROKEN', label: 'Broken' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  line_id: '',
  part_id: '',
  tgl_ganti: todayStr(),
  shift: '',
  counter_saat_diganti: '',
  jenis_penggantian: 'TERJADWAL',
  pic_name: '',
  remark: '',
};

// presetPart datang dari baris Monitoring yang diklik (part_id, line_id belum
// tentu ada di sana secara eksplisit -- kita ambil dari item hasil query
// pm-part list, lihat PmPartMonitoringPage). Field ini di-prefill supaya
// operator ga perlu nyari ulang part yang barusan dia liat statusnya.
function buildInitialForm(presetPart) {
  if (!presetPart) return emptyForm;
  return {
    ...emptyForm,
    line_id: String(presetPart.line_id ?? ''),
    part_id: String(presetPart.part_id ?? ''),
    counter_saat_diganti: presetPart.counter != null ? String(presetPart.counter) : '',
  };
}

function PmPartHistoryForm({ onSuccess, onCancel, presetPart }) {
  const [form, setForm] = useState(() => buildInitialForm(presetPart));
  const [errors, setErrors] = useState({});

  // Part hasil SCAN BARCODE (beda sumber dari presetPart yang datang dari
  // klik baris Monitoring) - disimpan lengkap (bukan cuma id) supaya bisa
  // ditampilkan sebagai info card (nama part, jig, stock) tanpa perlu
  // nunggu dropdown parts ke-load dulu.
  const [scannedPart, setScannedPart] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanCandidates, setScanCandidates] = useState(null); // >1 hasil match
  const [scanError, setScanError] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);

  const lockedPart = presetPart || scannedPart;
  const isPrefilled = Boolean(presetPart);
  const isLockedFromScan = Boolean(scannedPart) && !presetPart;

  const { data: lines = [] } = useLines({ isActive: true });
  const { data: partsData } = useParts({ line_id: form.line_id || undefined, limit: 200 });
  const parts = partsData?.items || [];

  const createMutation = useCreatePmPartHistory();

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value, ...(field === 'line_id' ? { part_id: '' } : {}) }));
  }

  function applyScannedPart(part) {
    setScannedPart(part);
    setScanCandidates(null);
    setScanError(null);
    setForm((prev) => ({
      ...prev,
      line_id: String(part.line_id ?? ''),
      part_id: String(part.id ?? ''),
    }));
  }

  function resetScan() {
    setScannedPart(null);
    setScanCandidates(null);
    setScanError(null);
    setForm((prev) => ({ ...prev, part_id: '' }));
  }

  async function handleBarcodeDetected(drawingNo) {
    setScannerOpen(false);
    setScanLoading(true);
    setScanError(null);
    setScanCandidates(null);
    try {
      const results = await lookupPartsByDrawingNo(drawingNo);
      if (results.length === 0) {
        setScanError(`Drawing No "${drawingNo}" tidak ditemukan di Master Data.`);
      } else if (results.length === 1) {
        applyScannedPart(results[0]);
      } else {
        // Drawing No sama bisa kepasang di >1 Line/Jig (lihat komentar
        // findByDrawingNoExact) - operator yang nentuin baris mana yang
        // dimaksud, bukan asal ambil hasil pertama.
        setScanCandidates(results);
      }
    } catch (err) {
      setScanError(err.response?.data?.message || 'Gagal mencari Drawing No.');
    } finally {
      setScanLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    if (!form.part_id) {
      setErrors({ part_id: 'Pilih Part terlebih dahulu' });
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        part_id: Number(form.part_id),
        tgl_ganti: form.tgl_ganti,
        shift: form.shift ? Number(form.shift) : undefined,
        counter_saat_diganti: Number(form.counter_saat_diganti),
        jenis_penggantian: form.jenis_penggantian,
        pic_name: form.pic_name,
        remark: form.remark || undefined,
      });
      setForm(buildInitialForm(presetPart));
      setScannedPart(null);
      onSuccess?.(result);
    } catch (err) {
      setErrors(err.response?.data?.errors || { _general: err.response?.data?.message || 'Gagal menyimpan' });
    }
  }

  // Dipakai berdiri sendiri di /pm-part/form (punya panel + judul sendiri)
  // maupun di dalam Modal dari Monitoring (Modal sudah kasih panel + judul,
  // jadi wrapper di sini dilewatin biar gak dobel border/padding).
  return (
    <form onSubmit={handleSubmit} className={isPrefilled ? undefined : 'panel'}>
      {!isPrefilled && (
        <div className="panel-header">
          <h2 className="panel-title">Input Penggantian Part</h2>
        </div>
      )}

      {!isPrefilled && (
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setScannerOpen(true)}
            disabled={scanLoading}
          >
            <ScanLine size={14} style={{ marginRight: 6 }} />
            {scanLoading ? 'Mencari Drawing No...' : 'Scan Barcode Drawing No'}
          </button>
          {scanError && (
            <div className="error-state" style={{ marginTop: 8, padding: 10, fontSize: 13 }}>
              {scanError}
            </div>
          )}
          {scanCandidates && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="caption">
                Drawing No ini kepakai di {scanCandidates.length} Line/Jig berbeda — pilih yang dimaksud:
              </span>
              {scanCandidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => applyScannedPart(c)}
                >
                  {c.line_name} — {c.jig_name} ({c.part_name})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isLockedFromScan && lockedPart && (
        <div
          style={{
            marginBottom: 14,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            fontSize: 13,
          }}
        >
          <strong>{lockedPart.drawing_no}</strong> — {lockedPart.part_name} ({lockedPart.jig_name}) di{' '}
          <strong>{lockedPart.line_name}</strong>
          <br />
          <span className="caption">
            {lockedPart.inventory_item_id
              ? `Stock saat ini: ${lockedPart.inv_current_stock ?? '-'} ${lockedPart.inv_spare_part_number ?? ''}. Akan dikurangi 1 otomatis saat disimpan.`
              : 'Part ini belum di-link ke Inventory Item — stock TIDAK akan otomatis berkurang.'}
          </span>
          <br />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 8, padding: '4px 10px', fontSize: 12 }}
            onClick={resetScan}
          >
            Scan ulang / pilih manual
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label className="form-label">Line</label>
          <select
            className="form-select"
            style={{ width: '100%' }}
            value={form.line_id}
            disabled={isPrefilled || isLockedFromScan}
            onChange={(e) => update('line_id', e.target.value)}
          >
            <option value="">Pilih Line</option>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.line_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Part (Drawing No / Nama)</label>
          <select
            className="form-select"
            style={{ width: '100%' }}
            value={form.part_id}
            disabled={isPrefilled || isLockedFromScan}
            onChange={(e) => update('part_id', e.target.value)}
          >
            <option value="">Pilih Part</option>
            {(isLockedFromScan && lockedPart ? [lockedPart] : parts).map((p) => (
              <option key={p.id} value={p.id}>
                {p.drawing_no} ({p.jig_name}) — {p.part_name}
              </option>
            ))}
          </select>
          {errors.part_id && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.part_id}</span>}
          {isPrefilled && (
            <span className="caption" style={{ display: 'block', marginTop: 4 }}>
              Part dikunci dari Monitoring. Batal dan buka lagi kalau salah pilih baris.
            </span>
          )}
        </div>

        <div>
          <label className="form-label">Tanggal Ganti</label>
          <input
            type="date"
            className="form-input"
            style={{ width: '100%' }}
            value={form.tgl_ganti}
            max={todayStr()}
            onChange={(e) => update('tgl_ganti', e.target.value)}
            required
          />
          {errors.tgl_ganti && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.tgl_ganti}</span>}
        </div>

        <div>
          <label className="form-label">Shift</label>
          <select
            className="form-select"
            style={{ width: '100%' }}
            value={form.shift}
            onChange={(e) => update('shift', e.target.value)}
          >
            <option value="">-</option>
            <option value="1">Shift 1</option>
            <option value="2">Shift 2</option>
            <option value="3">Shift 3</option>
          </select>
        </div>

        <div>
          <label className="form-label">Counter Saat Diganti</label>
          <input
            type="number"
            className="form-input mono"
            style={{ width: '100%', textAlign: 'right' }}
            value={form.counter_saat_diganti}
            min={0}
            onChange={(e) => update('counter_saat_diganti', e.target.value)}
            required
          />
          {errors.counter_saat_diganti && (
            <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.counter_saat_diganti}</span>
          )}
        </div>

        <div>
          <label className="form-label">Jenis Penggantian</label>
          <select
            className="form-select"
            style={{ width: '100%' }}
            value={form.jenis_penggantian}
            onChange={(e) => update('jenis_penggantian', e.target.value)}
          >
            {JENIS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">PIC</label>
          <input
            className="form-input"
            style={{ width: '100%' }}
            value={form.pic_name}
            onChange={(e) => update('pic_name', e.target.value)}
            placeholder="Nama yang mengerjakan"
            required
          />
          {errors.pic_name && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.pic_name}</span>}
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Remark (opsional)</label>
          <textarea
            className="form-input"
            style={{ width: '100%', minHeight: 60, resize: 'vertical' }}
            value={form.remark}
            onChange={(e) => update('remark', e.target.value)}
          />
        </div>
      </div>

      {errors._general && (
        <div className="error-state" style={{ marginTop: 12, padding: 10, fontSize: 13, textAlign: 'left' }}>
          {errors._general}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Menyimpan...' : 'Simpan Penggantian'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={createMutation.isPending}>
            Batal
          </button>
        )}
      </div>

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />
    </form>
  );
}

export default PmPartHistoryForm;