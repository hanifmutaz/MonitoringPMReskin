// src/components/masterdata/ImportMasterDataTab.jsx
// Reskin (checklist §3 item 4, batch 4/N): `.data-table`/`.btn`/`.form-*`
// lama dilepas TOTAL, diganti Tailwind + shadcn ui murni. Area upload
// diadaptasi dari referensi Mantis "Dropzone" (kotak dashed + ikon cloud +
// teks "Drag & Drop or Select file") sesuai arahan Mutaz - drag & drop
// beneran DITAMBAHKAN (bukan cuma visual) karena file input-nya cuma
// dipanggil via klik sebelumnya, jadi ini nambah cara baru buat pilih file
// tanpa ganti flow: onDrop tetap manggil handleFile yang sama persis kayak
// onChange input. Warna status badge (valid/warning/error) sebelumnya
// hardcode var(--success,#2e7d32) dll - sekarang dipetakan ke token
// ok/warn/danger yang udah ada di seluruh app. Logic
// preview/commit/re-validasi client-side/urutan mutasi TIDAK berubah sama
// sekali.
import { useRef, useState } from 'react';
import { UploadCloud, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useMasterDataImportMutations } from '../../hooks/useMasterDataImportMutations';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const STATUS_BADGE = {
  valid: { label: 'Valid', textClass: 'text-ok', Icon: CheckCircle2 },
  warning: { label: 'Auto-clean', textClass: 'text-warn', Icon: AlertTriangle },
  error: { label: 'Error', textClass: 'text-danger', Icon: XCircle },
};

function ImportMasterDataTab() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null); // { sheet_used, summary, rows, ignored_columns }
  const [rows, setRows] = useState([]); // rows yang bisa diedit Admin
  const [previewError, setPreviewError] = useState('');
  const [commitResult, setCommitResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const { preview: previewMutation, commit: commitMutation } = useMasterDataImportMutations();

  async function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    setPreviewError('');
    setCommitResult(null);
    try {
      const data = await previewMutation.mutateAsync(file);
      setPreview(data);
      // Default: baris valid/warning otomatis dicentang, baris error tidak
      setRows(
        data.rows.map((r) => ({
          ...r,
          include: r.status !== 'error',
        }))
      );
    } catch (err) {
      setPreview(null);
      setRows([]);
      setPreviewError(err.response?.data?.errors?._general || err.response?.data?.message || 'Gagal membaca file');
    }
  }

  function handleFileChange(e) {
    handleFile(e.target.files?.[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function updateRow(rowNumber, field, value) {
    setRows((prev) => prev.map((r) => (r.row_number === rowNumber ? { ...r, [field]: value } : r)));
  }

  function reRunErrorCheck(row) {
    // Re-validasi ringan di sisi client setelah Admin edit manual, supaya
    // baris yang tadinya error tapi sudah dibenerin gak nyangkut jadi 'error'
    // terus. Validasi FINAL & otoritatif tetap di server saat commit.
    const hasRequired = row.line_no && row.jig_name && row.drawing_no && row.part_name && row.cl_no && row.target_shot;
    return hasRequired ? 'valid' : 'error';
  }

  async function handleCommit() {
    setCommitResult(null);
    const finalRows = rows.map((r) => ({ ...r, status: r.include ? reRunErrorCheck(r) : r.status }));
    try {
      const result = await commitMutation.mutateAsync(finalRows.filter((r) => r.include));
      setCommitResult(result);
      setPreview(null);
      setRows([]);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setPreviewError(err.response?.data?.message || 'Gagal commit import');
    }
  }

  const includedCount = rows.filter((r) => r.include).length;
  const errorIncludedCount = rows.filter((r) => r.include && reRunErrorCheck(r) === 'error').length;

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Upload file Excel Master Data (.xlsx / .xlsm) untuk membuat Line, Part, dan CL Mapping sekaligus — tidak perlu
        input manual satu-satu. Sistem akan menampilkan preview dulu sebelum data benar-benar disimpan.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'mb-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
          isDragging ? 'border-primary bg-[var(--accent-dim)]' : 'border-border hover:border-primary/60 hover:bg-secondary'
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[var(--accent)]">
          <UploadCloud size={24} />
        </div>
        <div>
          <p className="text-sm font-medium">Drag & Drop atau Pilih File</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Drop file Excel di sini, atau{' '}
            <span className="text-primary underline underline-offset-2">klik untuk browse</span>
          </p>
        </div>
        {(fileName || previewMutation.isPending) && (
          <p className="font-[var(--font-mono)] text-xs text-[var(--text-dim)]">
            {previewMutation.isPending ? 'Membaca file...' : fileName}
          </p>
        )}
        {/* native <input>, BUKAN komponen Input shadcn - Input bukan forwardRef
            jadi fileInputRef.current bakal tetap null kalau dipasang di situ
            (klik toolbar buat trigger dialog file butuh ref ke DOM node asli) */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xlsm,.xls"
          className="hidden"
          onChange={handleFileChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {previewError && (
        <div className="mb-4 rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
          {previewError}
        </div>
      )}

      {commitResult && (
        <div className="mb-4 rounded-lg border border-[var(--border-soft)] bg-ok-dim p-3">
          <div className="mb-1.5 text-sm font-semibold">Import selesai</div>
          <p className="text-xs text-muted-foreground">
            Line baru: {commitResult.lines_created} · Part baru: {commitResult.parts_created} · Part diupdate:{' '}
            {commitResult.parts_updated} · CL Mapping baru: {commitResult.mappings_created} · CL Mapping dilewati
            (sudah ada): {commitResult.mappings_skipped} · Baris dilewati karena error: {commitResult.rows_skipped}
          </p>
          {commitResult.row_errors?.length > 0 && (
            <div className="mt-2">
              <span className="text-xs font-medium text-danger">Detail baris yang gagal:</span>
              <ul className="mt-1 list-disc pl-[18px] text-xs text-muted-foreground">
                {commitResult.row_errors.map((e) => (
                  <li key={e.row_number}>
                    Baris Excel #{e.row_number}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {preview && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Sheet dibaca: <strong className="text-foreground">{preview.sheet_used}</strong>
            </span>
            <span className="text-xs font-medium text-ok">✓ Valid: {preview.summary.valid}</span>
            <span className="text-xs font-medium text-warn">⚠ Auto-clean: {preview.summary.warning}</span>
            <span className="text-xs font-medium text-danger">✕ Error: {preview.summary.error}</span>
          </div>

          {preview.ignored_columns?.length > 0 && (
            <p className="mb-3 text-xs italic text-muted-foreground">Catatan: {preview.ignored_columns.join('; ')}</p>
          )}

          <div className="max-h-[480px] overflow-auto rounded-lg border border-border">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  {['', 'Baris', 'Status', 'Line No', 'CL No', 'Jig Name', 'Drawing No', 'Part Name', 'Target Shot', 'Info'].map(
                    (h, i) => (
                      <th
                        key={i}
                        className={cn(
                          'whitespace-nowrap px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]',
                          h === 'Target Shot' && 'text-right'
                        )}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const liveStatus = row.include ? reRunErrorCheck(row) : row.status;
                  const badge = STATUS_BADGE[liveStatus] || STATUS_BADGE.valid;
                  const Icon = badge.Icon;
                  return (
                    <tr key={row.row_number} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) => updateRow(row.row_number, 'include', e.target.checked)}
                          className="h-3.5 w-3.5 accent-[var(--accent)]"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-[var(--font-mono)] text-xs text-[var(--text-dim)]">
                        {row.row_number}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('inline-flex items-center gap-1 text-xs font-medium', badge.textClass)}>
                          <Icon size={12} /> {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-[var(--font-mono)] text-[13px]">{row.line_no}</td>
                      <td className="px-3 py-2.5 font-[var(--font-mono)] text-[13px]">{row.cl_no}</td>
                      <td className="px-3 py-2.5 text-[13px]">{row.jig_name}</td>
                      <td className="px-3 py-2.5">
                        <Input
                          className="h-7 w-[160px] font-[var(--font-mono)] text-xs"
                          value={row.drawing_no}
                          onChange={(e) => updateRow(row.row_number, 'drawing_no', e.target.value)}
                        />
                        {row.drawing_no_auto_cleaned && (
                          <div className="mt-0.5 text-[10px] text-[var(--text-faint)]">
                            asli: {row.drawing_no_original}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[13px]">{row.part_name}</td>
                      <td className="px-3 py-2.5 text-right font-[var(--font-mono)] text-[13px]">
                        {row.target_shot?.toLocaleString('id-ID') ?? '-'}
                      </td>
                      <td className="max-w-[220px] px-3 py-2.5 text-[11px] text-muted-foreground">
                        {row.errors?.join('; ')}
                        {!row.line_exists && !row.errors?.length && ' Line baru akan dibuat.'}
                        {row.line_exists && !row.part_exists && !row.errors?.length && ' Part baru di Line ini.'}
                        {row.part_exists && !row.errors?.length && ' Part sudah ada — CL Mapping akan ditambahkan.'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {includedCount} baris dicentang untuk diimport
              {errorIncludedCount > 0 && (
                <span className="text-danger"> — {errorIncludedCount} di antaranya masih error</span>
              )}
            </span>
            <Button
              disabled={includedCount === 0 || errorIncludedCount > 0 || commitMutation.isPending}
              onClick={handleCommit}
            >
              {commitMutation.isPending ? 'Menyimpan...' : `Commit Import (${includedCount} baris)`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default ImportMasterDataTab;
