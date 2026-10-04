// src/components/ExportExcelButton.jsx
// Tombol "Export Excel" untuk halaman history. Mengunduh SEMUA baris yang
// cocok dengan filter yang sedang aktif (bukan cuma halaman yang tampil).
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { downloadFile } from '../api/downloadApi';

function ExportExcelButton({ path, params, fallbackName = 'export.xlsx', label = 'Export Excel', disabled = false }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setPending(true);
    setError('');
    try {
      await downloadFile(path, params, fallbackName);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span role="alert" className="max-w-[320px] text-xs text-[var(--danger)]">
          {error}
        </span>
      )}
      <Button type="button" variant="outline" onClick={handleClick} disabled={disabled || pending}>
        {pending ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Mengunduh...
          </>
        ) : (
          <>
            <Download size={14} /> {label}
          </>
        )}
      </Button>
    </div>
  );
}

export default ExportExcelButton;
