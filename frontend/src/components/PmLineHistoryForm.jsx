// src/components/PmLineHistoryForm.jsx
import { useState } from 'react';
import { useLines } from '../hooks/useLines';
import { useCreatePmLineHistory } from '../hooks/usePmLineHistory';

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  line_id: '',
  jenis_pm: 'MONTHLY',
  tgl_input: todayStr(),
  pic_name: '',
  keterangan: '',
};

// presetLine datang dari baris Monitoring yang diklik ("Input Monthly" /
// "Input Weekly" di baris Line tersebut) supaya operator ga perlu nyari
// ulang Line yang barusan dia liat statusnya.
function buildInitialForm(presetLine, presetJenisPm) {
  if (!presetLine) return emptyForm;
  return {
    ...emptyForm,
    line_id: String(presetLine.line_id ?? ''),
    jenis_pm: presetJenisPm || 'MONTHLY',
  };
}

function PmLineHistoryForm({ onSuccess, onCancel, presetLine, presetJenisPm }) {
  const [form, setForm] = useState(() => buildInitialForm(presetLine, presetJenisPm));
  const [errors, setErrors] = useState({});
  const isPrefilled = Boolean(presetLine);

  const { data: lines = [] } = useLines({ isActive: true });
  const createMutation = useCreatePmLineHistory();

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    if (!form.line_id) {
      setErrors({ line_id: 'Pilih Line terlebih dahulu' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        line_id: Number(form.line_id),
        jenis_pm: form.jenis_pm,
        tgl_input: form.tgl_input,
        pic_name: form.pic_name,
        keterangan: form.keterangan || undefined,
      });
      setForm(buildInitialForm(presetLine, presetJenisPm));
      onSuccess?.();
    } catch (err) {
      setErrors(err.response?.data?.errors || { _general: err.response?.data?.message || 'Gagal menyimpan' });
    }
  }

  return (
    <form onSubmit={handleSubmit} className={isPrefilled ? undefined : 'panel'}>
      {!isPrefilled && (
        <div className="panel-header">
          <h2 className="panel-title">Input PM Monthly / Weekly</h2>
        </div>
      )}

      <ResetHint jenisPm={form.jenis_pm} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
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
          {errors.line_id && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.line_id}</span>}
        </div>

        <div>
          <label className="form-label">Jenis PM</label>
          <select
            className="form-select"
            style={{ width: '100%' }}
            value={form.jenis_pm}
            disabled={isPrefilled}
            onChange={(e) => update('jenis_pm', e.target.value)}
          >
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </div>

        <div>
          <label className="form-label">Tanggal Input</label>
          <input
            type="date"
            className="form-input"
            style={{ width: '100%' }}
            value={form.tgl_input}
            max={todayStr()}
            onChange={(e) => update('tgl_input', e.target.value)}
            required
          />
          {errors.tgl_input && <span style={{ color: 'var(--danger)', fontSize: 11 }}>{errors.tgl_input}</span>}
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
          <label className="form-label">Keterangan (opsional)</label>
          <textarea
            className="form-input"
            style={{ width: '100%', minHeight: 60, resize: 'vertical' }}
            value={form.keterangan}
            onChange={(e) => update('keterangan', e.target.value)}
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
          {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
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

// Hint kecil di dalam form, ngejelasin efek reset sebelum submit (UI Spec §4.10 - versi ringkas di dalam form)
function ResetHint({ jenisPm }) {
  if (jenisPm !== 'MONTHLY') {
    return (
      <div className="caption" style={{ padding: '8px 0' }}>
        Submit <strong>Weekly</strong> cuma reset Tgl PM Weekly Terakhir untuk Line ini.
      </div>
    );
  }
  return (
    <div className="caption" style={{ padding: '8px 0' }}>
      Submit <strong>Monthly</strong> reset Tgl PM Monthly Terakhir. Tgl PM Weekly Terakhir ikut ke-reset kalau Line
      ini pakai auto-reset (cek override per-Line di Master Data, atau default global di Settings).
    </div>
  );
}

export default PmLineHistoryForm;