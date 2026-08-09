// src/components/PmPartHistoryForm.jsx
import { useState } from 'react';
import { useLines } from '../hooks/useLines';
import { useParts } from '../hooks/useParts';
import { useCreatePmPartHistory } from '../hooks/usePmPartHistory';

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
  const isPrefilled = Boolean(presetPart);

  const { data: lines = [] } = useLines({ isActive: true });
  const { data: partsData } = useParts({ line_id: form.line_id || undefined, limit: 200 });
  const parts = partsData?.items || [];

  const createMutation = useCreatePmPartHistory();

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value, ...(field === 'line_id' ? { part_id: '' } : {}) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    if (!form.part_id) {
      setErrors({ part_id: 'Pilih Part terlebih dahulu' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        part_id: Number(form.part_id),
        tgl_ganti: form.tgl_ganti,
        shift: form.shift ? Number(form.shift) : undefined,
        counter_saat_diganti: Number(form.counter_saat_diganti),
        jenis_penggantian: form.jenis_penggantian,
        pic_name: form.pic_name,
        remark: form.remark || undefined,
      });
      setForm(buildInitialForm(presetPart));
      onSuccess?.();
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label className="form-label">Line</label>
          <select
            className="form-select"
            style={{ width: '100%' }}
            value={form.line_id}
            disabled={isPrefilled}
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
            disabled={isPrefilled}
            onChange={(e) => update('part_id', e.target.value)}
          >
            <option value="">Pilih Part</option>
            {parts.map((p) => (
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
    </form>
  );
}

export default PmPartHistoryForm;