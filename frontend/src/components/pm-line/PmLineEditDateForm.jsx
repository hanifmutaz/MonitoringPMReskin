// src/components/pm-line/PmLineEditDateForm.jsx
// Form koreksi "Tgl PM Monthly/Weekly Terakhir" (Admin only, lihat
// PATCH /pm-line/:lineId/last-date). Beda dari Input PM: ini TIDAK bikin
// riwayat baru, cuma koreksi baseline + wajib alasan (masuk audit log).
import { useState } from 'react';
import { useUpdatePmLineLastDate } from '../../hooks/usePmLineStatus';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { todayString } from '../../utils/todayString';

function PmLineEditDateForm({ line, jenisPm, onCancel, onSuccess }) {
  const current = jenisPm === 'WEEKLY' ? line.tgl_pm_weekly_terakhir : line.tgl_pm_monthly_terakhir;
  const [tgl, setTgl] = useState(current || todayString());
  const [alasan, setAlasan] = useState('');
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const mutation = useUpdatePmLineLastDate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    try {
      const result = await mutation.mutateAsync({ lineId: line.line_id, jenis_pm: jenisPm, tgl, alasan });
      if (result.poin_recomputed) {
        onSuccess?.();
      } else {
        // Tanggal sudah tersimpan, tapi poin belum ikut dihitung ulang
        // (ConMas belum terkonfigurasi / error) - jangan ditutup diam-diam.
        setNotice('Tanggal tersimpan, tapi poin akumulasi belum dihitung ulang (sync ConMas belum jalan). Poin akan menyesuaikan di sync berikutnya.');
      }
    } catch (err) {
      setErrors(err.response?.data?.errors || { _general: err.response?.data?.message || 'Gagal menyimpan' });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4.5">
      <h2 className="m-0 mb-1 font-[var(--font-display)] text-[15px] font-semibold">
        Koreksi Tgl {jenisPm === 'MONTHLY' ? 'Monthly' : 'Weekly'} Terakhir — {line.line_name}
      </h2>
      <p className="m-0 mb-3.5 text-[12px] text-[var(--text-faint)]">
        Ini koreksi baseline, bukan input PM baru: riwayat PM tidak berubah, poin dihitung ulang dari tanggal baru, dan
        perubahan tercatat di Audit Log.
      </p>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <Label className="mb-2.5">Tanggal baru</Label>
          <Input type="date" value={tgl} max={todayString()} onChange={(e) => setTgl(e.target.value)} />
          {errors.tgl && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.tgl}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-2.5">Alasan koreksi</Label>
          <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} rows={2} placeholder="Contoh: salah input tanggal saat PM" />
          {errors.alasan && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.alasan}</p>}
        </div>
      </div>

      {errors._general && <p className="mt-3 text-[12px] text-[var(--danger)]">{errors._general}</p>}
      {notice && <p className="mt-3 text-[12px] text-[var(--warn)]">{notice}</p>}

      <div className="mt-4 flex gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? 'Menyimpan…' : 'Simpan Koreksi'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          {notice ? 'Tutup' : 'Batal'}
        </Button>
      </div>
    </form>
  );
}

export default PmLineEditDateForm;
