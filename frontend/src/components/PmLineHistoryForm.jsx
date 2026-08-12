// src/components/PmLineHistoryForm.jsx
// Reskin (checklist §3 item 6 "PM pages", batch 2/N): `.panel`/
// `.panel-header`/`.panel-title`/`.form-label`/`.form-select`/`.form-input`/
// `.error-state`/`.caption`/`.btn`/inline style lama dilepas total, diganti
// Tailwind + shadcn ui (Select/Input/Textarea/Label/Button). Dua mode
// render TETAP SAMA: dipanggil bare di dalam Modal (isPrefilled=true, dari
// PmLineStatusPage - Modal/DialogContent udah kasih padding sendiri) VS
// dipanggil standalone di PmLineHistoryPage (isPrefilled=false, butuh
// panel-nya sendiri: rounded-lg border-border bg-card p-4.5, ngikutin
// pola Master Data/Dashboard). Logic create/preset/reset-hint TIDAK
// berubah sama sekali.
import { useState } from 'react';
import { useLines } from '../hooks/useLines';
import { useCreatePmLineHistory } from '../hooks/usePmLineHistory';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
    <form onSubmit={handleSubmit} className={isPrefilled ? undefined : 'rounded-lg border border-border bg-card p-4.5'}>
      {!isPrefilled && (
        <div className="mb-4">
          <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">Input PM Monthly / Weekly</h2>
        </div>
      )}

      <ResetHint jenisPm={form.jenis_pm} />

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5">Line</Label>
          <Select value={form.line_id} onValueChange={(v) => update('line_id', v)} disabled={isPrefilled}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Line" />
            </SelectTrigger>
            <SelectContent>
              {lines.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.line_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.line_id && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.line_id}</p>}
        </div>

        <div>
          <Label className="mb-1.5">Jenis PM</Label>
          <Select value={form.jenis_pm} onValueChange={(v) => update('jenis_pm', v)} disabled={isPrefilled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5">Tanggal Input</Label>
          <Input
            type="date"
            value={form.tgl_input}
            max={todayStr()}
            onChange={(e) => update('tgl_input', e.target.value)}
            required
          />
          {errors.tgl_input && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.tgl_input}</p>}
        </div>

        <div>
          <Label className="mb-1.5">PIC</Label>
          <Input
            value={form.pic_name}
            onChange={(e) => update('pic_name', e.target.value)}
            placeholder="Nama yang mengerjakan"
            required
          />
          {errors.pic_name && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.pic_name}</p>}
        </div>

        <div className="sm:col-span-2">
          <Label className="mb-1.5">Keterangan (opsional)</Label>
          <Textarea className="min-h-[60px]" value={form.keterangan} onChange={(e) => update('keterangan', e.target.value)} />
        </div>
      </div>

      {errors._general && (
        <div className="mt-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
          {errors._general}
        </div>
      )}

      <div className="mt-4 flex gap-2.5">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={createMutation.isPending}>
            Batal
          </Button>
        )}
      </div>
    </form>
  );
}

// Hint kecil di dalam form, ngejelasin efek reset sebelum submit (UI Spec §4.10 - versi ringkas di dalam form)
function ResetHint({ jenisPm }) {
  if (jenisPm !== 'MONTHLY') {
    return (
      <div className="py-2 text-xs text-muted-foreground">
        Submit <strong className="text-foreground">Weekly</strong> cuma reset Tgl PM Weekly Terakhir untuk Line ini.
      </div>
    );
  }
  return (
    <div className="py-2 text-xs text-muted-foreground">
      Submit <strong className="text-foreground">Monthly</strong> reset Tgl PM Monthly Terakhir. Tgl PM Weekly
      Terakhir ikut ke-reset kalau Line ini pakai auto-reset (cek override per-Line di Master Data, atau default
      global di Settings).
    </div>
  );
}

export default PmLineHistoryForm;
