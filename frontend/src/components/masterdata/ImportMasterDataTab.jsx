// src/components/masterdata/ImportMasterDataTab.jsx
import { useRef, useState } from 'react';
import { UploadCloud, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useMasterDataImportMutations } from '../../hooks/useMasterDataImportMutations';

const STATUS_BADGE = {
  valid: { label: 'Valid', color: 'var(--success, #2e7d32)', Icon: CheckCircle2 },
  warning: { label: 'Auto-clean', color: 'var(--warning, #b8860b)', Icon: AlertTriangle },
  error: { label: 'Error', color: 'var(--danger)', Icon: XCircle },
};

function ImportMasterDataTab() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null); // { sheet_used, summary, rows, ignored_columns }
  const [rows, setRows] = useState([]); // rows yang bisa diedit Admin
  const [previewError, setPreviewError] = useState('');
  const [commitResult, setCommitResult] = useState(null);

  const { preview: previewMutation, commit: commitMutation } = useMasterDataImportMutations();

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
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
      <div className="caption" style={{ marginBottom: 12 }}>
        Upload file Excel Master Data (.xlsx / .xlsm) untuk membuat Line, Part, dan CL Mapping sekaligus — tidak perlu
        input manual satu-satu. Sistem akan menampilkan preview dulu sebelum data benar-benar disimpan.
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
          <UploadCloud size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          Pilih File Excel
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xlsm,.xls"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {fileName && <span className="caption">{fileName}</span>}
        {previewMutation.isPending && <span className="caption">Membaca file...</span>}
      </div>

      {previewError && (
        <div className="error-state" style={{ marginBottom: 16, padding: 8, fontSize: 12 }}>
          {previewError}
        </div>
      )}

      {commitResult && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            border: '1px solid var(--border-soft)',
            background: 'var(--surface-alt, rgba(46,125,50,0.06))',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Import selesai</div>
          <div className="caption">
            Line baru: {commitResult.lines_created} · Part baru: {commitResult.parts_created} · Part diupdate:{' '}
            {commitResult.parts_updated} · CL Mapping baru: {commitResult.mappings_created} · CL Mapping dilewati
            (sudah ada): {commitResult.mappings_skipped} · Baris dilewati karena error: {commitResult.rows_skipped}
          </div>
          {commitResult.row_errors?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span className="caption" style={{ color: 'var(--danger)' }}>
                Detail baris yang gagal:
              </span>
              <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12 }}>
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
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="caption">
              Sheet dibaca: <strong>{preview.sheet_used}</strong>
            </span>
            <span className="caption" style={{ color: STATUS_BADGE.valid.color }}>
              ✓ Valid: {preview.summary.valid}
            </span>
            <span className="caption" style={{ color: STATUS_BADGE.warning.color }}>
              ⚠ Auto-clean: {preview.summary.warning}
            </span>
            <span className="caption" style={{ color: STATUS_BADGE.error.color }}>
              ✕ Error: {preview.summary.error}
            </span>
          </div>

          {preview.ignored_columns?.length > 0 && (
            <div className="caption" style={{ marginBottom: 12, fontStyle: 'italic' }}>
              Catatan: {preview.ignored_columns.join('; ')}
            </div>
          )}

          <div style={{ maxHeight: 480, overflow: 'auto', border: '1px solid var(--border-soft)', borderRadius: 8 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th style={{ width: 60 }}>Baris</th>
                  <th>Status</th>
                  <th>Line No</th>
                  <th>CL No</th>
                  <th>Jig Name</th>
                  <th>Drawing No</th>
                  <th>Part Name</th>
                  <th className="mono">Target Shot</th>
                  <th>Info</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const liveStatus = row.include ? reRunErrorCheck(row) : row.status;
                  const badge = STATUS_BADGE[liveStatus] || STATUS_BADGE.valid;
                  const Icon = badge.Icon;
                  return (
                    <tr key={row.row_number}>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) => updateRow(row.row_number, 'include', e.target.checked)}
                        />
                      </td>
                      <td className="mono caption">{row.row_number}</td>
                      <td>
                        <span
                          className="caption"
                          style={{ color: badge.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Icon size={12} /> {badge.label}
                        </span>
                      </td>
                      <td className="mono">{row.line_no}</td>
                      <td className="mono">{row.cl_no}</td>
                      <td>{row.jig_name}</td>
                      <td>
                        <input
                          className="form-input mono"
                          style={{ width: 160, padding: '4px 6px', fontSize: 12 }}
                          value={row.drawing_no}
                          onChange={(e) => updateRow(row.row_number, 'drawing_no', e.target.value)}
                        />
                        {row.drawing_no_auto_cleaned && (
                          <div className="caption" style={{ fontSize: 10 }}>
                            asli: {row.drawing_no_original}
                          </div>
                        )}
                      </td>
                      <td>{row.part_name}</td>
                      <td className="mono">{row.target_shot?.toLocaleString('id-ID') ?? '-'}</td>
                      <td className="caption" style={{ fontSize: 11, maxWidth: 220 }}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span className="caption">
              {includedCount} baris dicentang untuk diimport
              {errorIncludedCount > 0 && (
                <span style={{ color: 'var(--danger)' }}> — {errorIncludedCount} di antaranya masih error</span>
              )}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              disabled={includedCount === 0 || errorIncludedCount > 0 || commitMutation.isPending}
              onClick={handleCommit}
            >
              {commitMutation.isPending ? 'Menyimpan...' : `Commit Import (${includedCount} baris)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ImportMasterDataTab;
