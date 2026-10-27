// src/components/HistoryEditModal.jsx
//
// Edit history PM Part / PM Line. Sengaja TERBATAS: hanya Remark (Keterangan), PIC, dan
// Alasan Keterlambatan (kalau PM-nya telat). Tanggal, counter, jenis dan ketepatan tidak
// bisa diubah karena menentukan counter wear / baseline PM / KPI ketepatan.
// Remark WAJIB: baris lama yang remark-nya kosong dilengkapi lewat dialog ini.
import { useState } from 'react';
import Modal from './Modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.subtitle - ringkasan baris yang diedit (tanggal, line, dst)
 * @param {'remark'|'keterangan'} props.remarkField - nama field di API
 * @param {string} props.remarkLabel - 'Remark' / 'Keterangan'
 * @param {object} props.item - baris history
 * @param {{mutateAsync: Function, isPending: boolean}} props.mutation
 * @param {() => void} props.onClose
 */
function HistoryEditModal({ title, subtitle, remarkField, remarkLabel, item, mutation, onClose }) {
  const isLate = item.on_time === false;
  const [form, setForm] = useState({
    remark: item[remarkField] || '',
    pic_name: item.pic_name || '',
    alasan_telat: item.alasan_telat || '',
  });
  const [errors, setErrors] = useState({});

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (form.remark.trim().length < 3) next[remarkField] = `${remarkLabel} wajib diisi (minimal 3 karakter)`;
    if (!form.pic_name.trim()) next.pic_name = 'PIC wajib diisi';
    if (isLate && form.alasan_telat.trim().length < 5) next.alasan_telat = 'Alasan keterlambatan wajib diisi (minimal 5 karakter)';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setErrors({});
    try {
      await mutation.mutateAsync({
        id: item.id,
        [remarkField]: form.remark.trim(),
        pic_name: form.pic_name.trim(),
        ...(isLate ? { alasan_telat: form.alasan_telat.trim() } : {}),
      });
      onClose();
    } catch (err) {
      setErrors(err.response?.data?.errors || { _general: err.response?.data?.message || 'Gagal menyimpan' });
    }
  }

  return (
    <Modal title={title} onClose={onClose} width={520}>
      <form onSubmit={handleSubmit}>
        {subtitle && <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>}
        <p className="mb-3.5 text-xs text-[var(--text-faint)]">
          Tanggal, counter, jenis dan ketepatan tidak bisa diubah. Perubahan tercatat di Audit Log.
        </p>

        <div className="flex flex-col gap-3.5">
          <div>
            <Label className="mb-2.5" htmlFor="history-edit-remark">
              {remarkLabel} <span className="text-[var(--danger)]">*</span>
            </Label>
            <Textarea
              id="history-edit-remark"
              className="min-h-[80px]"
              value={form.remark}
              onChange={(e) => update('remark', e.target.value)}
              maxLength={500}
              required
              autoFocus
            />
            {errors[remarkField] && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors[remarkField]}</p>}
          </div>

          <div>
            <Label className="mb-2.5" htmlFor="history-edit-pic">
              PIC <span className="text-[var(--danger)]">*</span>
            </Label>
            <Input id="history-edit-pic" value={form.pic_name} onChange={(e) => update('pic_name', e.target.value)} maxLength={150} required />
            {errors.pic_name && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.pic_name}</p>}
          </div>

          {isLate && (
            <div>
              <Label className="mb-2.5" htmlFor="history-edit-alasan">
                Alasan Keterlambatan <span className="text-[var(--danger)]">*</span>
              </Label>
              <Textarea
                id="history-edit-alasan"
                className="min-h-[60px]"
                value={form.alasan_telat}
                onChange={(e) => update('alasan_telat', e.target.value)}
                maxLength={500}
                required
              />
              {errors.alasan_telat && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.alasan_telat}</p>}
            </div>
          )}
        </div>

        {errors._general && (
          <div className="mt-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{errors._general}</div>
        )}

        <div className="mt-4 flex gap-2.5">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default HistoryEditModal;
