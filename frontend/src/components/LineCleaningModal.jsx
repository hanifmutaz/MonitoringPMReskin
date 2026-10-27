// src/components/LineCleaningModal.jsx
// Catat cleaning Line yang tidak running. Tanggal opsional (kosong = hari ini di server).
import { useState } from 'react';
import Modal from './Modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useCreateLineCleaning } from '../hooks/useLineCleaning';
import { todayString } from '../utils/todayString';

function LineCleaningModal({ line, onClose }) {
  const [form, setForm] = useState({ tgl_cleaning: todayString(), pic_name: '', keterangan: '' });
  const [errors, setErrors] = useState({});
  const mutation = useCreateLineCleaning();

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    // Spasi saja tidak dianggap terisi (required HTML hanya cek kosong); server memvalidasi ulang.
    if (!form.keterangan.trim()) {
      setErrors({ keterangan: 'Keterangan wajib diisi' });
      return;
    }
    try {
      await mutation.mutateAsync({
        line_id: line.line_id,
        tgl_cleaning: form.tgl_cleaning || undefined,
        pic_name: form.pic_name,
        keterangan: form.keterangan.trim(),
      });
      onClose();
    } catch (err) {
      setErrors(err.response?.data?.errors || { _general: err.response?.data?.message || 'Gagal menyimpan' });
    }
  }

  return (
    <Modal title={`Catat Cleaning - ${line.line_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p className="mb-3 text-xs text-muted-foreground">
          Menyimpan cleaning me-reset hitungan {line.cleaning_baseline_date ? 'interval' : ''} cleaning berikutnya untuk Line ini.
        </p>
        <div className="grid grid-cols-1 gap-3.5">
          <div>
            <Label className="mb-2.5">Tanggal Cleaning</Label>
            <Input type="date" value={form.tgl_cleaning} max={todayString()} onChange={(e) => update('tgl_cleaning', e.target.value)} required />
            {errors.tgl_cleaning && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.tgl_cleaning}</p>}
          </div>
          <div>
            <Label className="mb-2.5">PIC</Label>
            <Input value={form.pic_name} onChange={(e) => update('pic_name', e.target.value)} placeholder="Nama yang mengerjakan" required />
            {errors.pic_name && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.pic_name}</p>}
          </div>
          <div>
            <Label className="mb-2.5">Keterangan</Label>
            <Textarea
              className="min-h-[60px]"
              maxLength={500}
              required
              placeholder="Apa yang dibersihkan / kondisi Line saat cleaning"
              value={form.keterangan}
              onChange={(e) => update('keterangan', e.target.value)}
            />
            {errors.keterangan && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.keterangan}</p>}
          </div>
        </div>

        {(errors._general || errors.line_id) && (
          <div className="mt-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
            {errors._general || errors.line_id}
          </div>
        )}

        <div className="mt-4 flex gap-2.5">
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Menyimpan...' : 'Simpan Cleaning'}</Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>Batal</Button>
        </div>
      </form>
    </Modal>
  );
}

export default LineCleaningModal;
