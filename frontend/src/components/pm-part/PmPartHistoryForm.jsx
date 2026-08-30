// src/components/pm-part/PmPartHistoryForm.jsx
// Relocated from components/PmPartHistoryForm.jsx (docs/frontend/
// MIGRATION-PLAN.md Phase 7 - domain/pm-part/ extraction, following the
// components/masterdata/ precedent). Import depth updated (./ui/x ->
// ../ui/x, ../hooks/x -> ../../hooks/x, ../api/x -> ../../api/x);
// BarcodeScannerModal import stays './BarcodeScannerModal' since it moved
// to this same folder. JENIS_OPTIONS now comes from the shared
// './constants' (previously a local duplicate of PmPartHistoryPage.jsx's
// JENIS_LABEL - see constants.js for why). Form logic, 2-mode rendering,
// scan/lookup/candidate-selection/create-mutation behaviour unchanged.
//
// Reskin (checklist §3 item 6 "PM pages", batch 5/N): `.panel`/
// `.panel-header`/`.panel-title`/`.form-label`/`.form-select`/`.form-input`/
// `.error-state`/`.caption`/`.btn`/`.mono`/inline style lama dilepas total,
// diganti Tailwind + shadcn ui (Select/Input/Textarea/Label/Button). 2 mode
// render TETAP SAMA (bare di Modal dari Monitoring VS standalone panel di
// /pm-part/form). Card info "Part dikunci dari scan" & tombol "Scan ulang"
// dipetakan ke Button/token yang sama dipakai form lain (bg-[var(--accent-
// dim)] border-primary, sama kayak Banner.jsx). Logic scan barcode/lookup
// drawing no/candidate selection/create mutation TIDAK berubah sama sekali.
import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { useLines } from '../../hooks/useLines';
import { useParts } from '../../hooks/useParts';
import { useCreatePmPartHistory } from '../../hooks/usePmPartHistory';
import { lookupPartsByDrawingNo } from '../../api/partsApi';
import BarcodeScannerModal from './BarcodeScannerModal';
import { JENIS_OPTIONS } from './constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  line_id: '',
  part_id: '',
  tgl_ganti: todayStr(),
  shift: 'none',
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
        shift: form.shift === 'none' ? undefined : Number(form.shift),
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
    <form onSubmit={handleSubmit} className={isPrefilled ? undefined : 'rounded-lg border border-border bg-card p-4.5'}>
      {!isPrefilled && (
        <div className="mb-4">
          <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">Input Penggantian Part</h2>
        </div>
      )}

      {!isPrefilled && (
        <div className="mb-3.5">
          <Button type="button" variant="outline" onClick={() => setScannerOpen(true)} disabled={scanLoading}>
            <ScanLine size={14} />
            {scanLoading ? 'Mencari Drawing No...' : 'Scan Barcode Drawing No'}
          </Button>
          {scanError && (
            <div className="mt-2 rounded-lg bg-[var(--danger-dim)] px-2.5 py-2.5 text-[13px] text-[var(--danger)]">
              {scanError}
            </div>
          )}
          {scanCandidates && (
            <div className="mt-2 flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">
                Drawing No ini kepakai di {scanCandidates.length} Line/Jig berbeda — pilih yang dimaksud:
              </span>
              {scanCandidates.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  variant="outline"
                  className="justify-start text-left"
                  onClick={() => applyScannedPart(c)}
                >
                  {c.line_name} — {c.jig_name} ({c.part_name})
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {isLockedFromScan && lockedPart && (
        <div className="mb-3.5 rounded-lg border border-primary bg-[var(--accent-dim)] px-3.5 py-2.5 text-[13px]">
          <strong>{lockedPart.drawing_no}</strong> — {lockedPart.part_name} ({lockedPart.jig_name}) di{' '}
          <strong>{lockedPart.line_name}</strong>
          <div className="mt-1 text-xs text-muted-foreground">
            {lockedPart.inventory_item_id
              ? `Stock saat ini: ${lockedPart.inv_current_stock ?? '-'} ${lockedPart.inv_spare_part_number ?? ''}. Akan dikurangi 1 otomatis saat disimpan.`
              : 'Part ini belum di-link ke Inventory Item — stock TIDAK akan otomatis berkurang.'}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={resetScan}>
            Scan ulang / pilih manual
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5">Line</Label>
          <Select value={form.line_id} onValueChange={(v) => update('line_id', v)} disabled={isPrefilled || isLockedFromScan}>
            <SelectTrigger aria-label="Pilih Line">
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
        </div>

        <div>
          <Label className="mb-1.5">Part (Drawing No / Nama)</Label>
          <Select value={form.part_id} onValueChange={(v) => update('part_id', v)} disabled={isPrefilled || isLockedFromScan}>
            <SelectTrigger aria-label="Pilih Part">
              <SelectValue placeholder="Pilih Part" />
            </SelectTrigger>
            <SelectContent>
              {(isLockedFromScan && lockedPart ? [lockedPart] : parts).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.drawing_no} ({p.jig_name}) — {p.part_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.part_id && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.part_id}</p>}
          {isPrefilled && (
            <p className="mt-1 text-xs text-muted-foreground">
              Part dikunci dari Monitoring. Batal dan buka lagi kalau salah pilih baris.
            </p>
          )}
        </div>

        <div>
          <Label className="mb-1.5">Tanggal Ganti</Label>
          <Input
            type="date"
            value={form.tgl_ganti}
            max={todayStr()}
            onChange={(e) => update('tgl_ganti', e.target.value)}
            required
          />
          {errors.tgl_ganti && <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.tgl_ganti}</p>}
        </div>

        <div>
          <Label className="mb-1.5">Shift</Label>
          <Select value={form.shift} onValueChange={(v) => update('shift', v)}>
            <SelectTrigger aria-label="Pilih Shift">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-</SelectItem>
              <SelectItem value="1">Shift 1</SelectItem>
              <SelectItem value="2">Shift 2</SelectItem>
              <SelectItem value="3">Shift 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5">Counter Saat Diganti</Label>
          <Input
            type="number"
            className="text-right font-[var(--font-mono)]"
            value={form.counter_saat_diganti}
            min={0}
            onChange={(e) => update('counter_saat_diganti', e.target.value)}
            required
          />
          {errors.counter_saat_diganti && (
            <p className="mt-1 text-[11px] text-[var(--danger)]">{errors.counter_saat_diganti}</p>
          )}
        </div>

        <div>
          <Label className="mb-1.5">Jenis Penggantian</Label>
          <Select value={form.jenis_penggantian} onValueChange={(v) => update('jenis_penggantian', v)}>
            <SelectTrigger aria-label="Pilih Jenis Penggantian">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JENIS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Label className="mb-1.5">Remark (opsional)</Label>
          <Textarea className="min-h-[60px]" value={form.remark} onChange={(e) => update('remark', e.target.value)} />
        </div>
      </div>

      {errors._general && (
        <div className="mt-3 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
          {errors._general}
        </div>
      )}

      <div className="mt-4 flex gap-2.5">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Menyimpan...' : 'Simpan Penggantian'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={createMutation.isPending}>
            Batal
          </Button>
        )}
      </div>

      <BarcodeScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleBarcodeDetected} />
    </form>
  );
}

export default PmPartHistoryForm;
