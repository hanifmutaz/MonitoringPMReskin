// src/components/settings/AutoBackupPanel.jsx
//
// Panel di bawah setting "Backup Otomatis" (Settings > Umum, Admin only):
// hasil run terakhir, tombol "Jalankan Sekarang", dan daftar file backup yang
// tersimpan di server (BACKUP_DIR) dengan tombol unduh.
// Jadwal/format/jumlah simpan diedit lewat SettingRow seperti setting lain.
import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, DatabaseBackup, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { useAutoBackupStatus, useRunAutoBackup } from '../../hooks/useSettings';
import { downloadFile } from '../../api/downloadApi';

const TRIGGER_LABEL = { auto: 'Otomatis', manual: 'Manual' };

const wibFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatWib(iso) {
  return iso ? `${wibFormat.format(new Date(iso))} WIB` : '-';
}

function formatSize(bytes) {
  if (bytes == null) return '-';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AutoBackupPanel() {
  const { data, isLoading, isError } = useAutoBackupStatus();
  const runMutation = useRunAutoBackup();
  const [message, setMessage] = useState(null); // { ok, text }
  const [downloading, setDownloading] = useState(null);

  async function handleRun() {
    setMessage(null);
    try {
      const res = await runMutation.mutateAsync();
      setMessage({ ok: true, text: `Backup tersimpan di server: ${res.name}` });
    } catch (err) {
      setMessage({ ok: false, text: err.response?.data?.message || 'Backup gagal' });
    }
  }

  async function handleDownload(file) {
    setDownloading(file.name);
    setMessage(null);
    try {
      await downloadFile(`/settings/backup/auto/files/${encodeURIComponent(file.name)}`, undefined, file.name);
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setDownloading(null);
    }
  }

  const busy = runMutation.isPending || Boolean(data?.running);
  const lastRun = data?.last_run;
  const files = data?.files || [];

  return (
    <div className="mt-3 border-t border-[var(--border-soft)] pt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-xs">
          <div className="text-[13px] font-medium">Status Terakhir</div>
          {isLoading && <div className="text-muted-foreground">Memuat...</div>}
          {isError && <div className="text-destructive">Gagal memuat status backup</div>}
          {!isLoading && !isError && !lastRun && (
            <div className="text-muted-foreground">Belum pernah berjalan di server ini.</div>
          )}
          {lastRun && (
            <div className={`mt-0.5 flex items-start gap-1.5 ${lastRun.ok ? 'text-[var(--ok)]' : 'text-destructive'}`}>
              {lastRun.ok ? <CheckCircle2 size={14} className="mt-px shrink-0" /> : <XCircle size={14} className="mt-px shrink-0" />}
              <span>
                {lastRun.ok ? 'Berhasil' : 'Gagal'} - {formatWib(lastRun.at)} ({TRIGGER_LABEL[lastRun.trigger] || lastRun.trigger})
                {!lastRun.ok && lastRun.message ? `: ${lastRun.message}` : ''}
              </span>
            </div>
          )}
        </div>
        <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={handleRun} disabled={busy}>
          {busy ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Membuat...
            </>
          ) : (
            <>
              <DatabaseBackup size={13} /> Jalankan Sekarang
            </>
          )}
        </Button>
      </div>

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`m-0 mt-2 text-xs ${message.ok ? 'text-[var(--ok)]' : 'text-destructive'}`}>
          {message.text}
        </p>
      )}

      <div className="mt-3 text-[13px] font-medium">File di Server ({files.length})</div>
      {files.length === 0 && !isLoading && (
        <div className="text-xs text-muted-foreground">Belum ada file backup tersimpan.</div>
      )}
      {files.length > 0 && (
        <ul className="m-0 mt-1 flex max-h-64 list-none flex-col divide-y divide-[var(--border-soft)] overflow-y-auto p-0">
          {files.map((f) => (
            <li key={f.name} className="flex items-center justify-between gap-3 py-2 text-xs">
              <div className="min-w-0">
                <div className="truncate font-[var(--font-mono)] text-[12px]">{f.name}</div>
                <div className="text-muted-foreground">
                  {formatWib(f.created_at)} · {formatSize(f.size)} · {TRIGGER_LABEL[f.trigger] || f.trigger}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label={`Unduh ${f.name}`}
                disabled={downloading !== null}
                onClick={() => handleDownload(f)}
              >
                {downloading === f.name ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="m-0 mt-2 text-[11px] text-[var(--text-faint)]">
        File disimpan di server (folder BACKUP_DIR), berisi data akun user, dan yang lebih lama dari jumlah simpan dihapus
        otomatis. Untuk cadangan yang benar-benar aman, salin folder ini juga ke tempat lain.
      </p>
    </div>
  );
}

export default AutoBackupPanel;
