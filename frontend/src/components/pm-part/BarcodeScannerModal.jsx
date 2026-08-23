// src/components/pm-part/BarcodeScannerModal.jsx
// Relocated from components/BarcodeScannerModal.jsx (docs/frontend/
// MIGRATION-PLAN.md Phase 7 - domain/pm-part/ extraction). Only used by
// PmPartHistoryForm.jsx (scans a Drawing No, a PM Part concept). Scan
// logic and markup unchanged, only the file's location and import depth
// (./ui/x -> ../ui/x) change.
//
// Scan barcode Drawing No pakai kamera device (target utama: iPad di
// lapangan, lihat konteks fitur di PmPartHistoryForm.jsx). Pakai
// @zxing/browser (BrowserMultiFormatReader) - jalan langsung di atas
// getUserMedia, kompatibel Safari iOS (beda dari beberapa library scan lain
// yang gantung ke BarcodeDetector native yang belum ke-support di Safari).
//
// Device fisik yang dipakai pabrik ini kemungkinan besar CODE_128/CODE_39
// (barcode linear umum buat label part industrial) - decoder default
// BrowserMultiFormatReader sudah cover semua format 1D umum tanpa perlu
// konfigurasi tambahan, jadi gak perlu di-pin ke 1 format spesifik.
//
// Reskin (checklist §3 item 6 "PM pages", batch 5/N): `.error-state`/
// `.caption`/`.btn`/inline style lama dilepas total, diganti Tailwind.
// Scan logic (BrowserMultiFormatReader lifecycle, error handling,
// cleanup) TIDAK berubah sama sekali - cuma markup.
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Camera, X } from 'lucide-react';
import { Button } from '../ui/button';

function BarcodeScannerModal({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    // facingMode 'environment' - kamera belakang iPad, bukan kamera depan
    // (Drawing No ada di label fisik part, bukan di wajah operator).
    reader
      .decodeFromConstraints({ video: { facingMode: 'environment' } }, videoRef.current, (result) => {
        if (cancelled) return;
        if (result) {
          const text = result.getText();
          controlsRef.current?.stop();
          onDetected(text);
        }
        // NotFoundException dilempar TERUS-MENERUS tiap frame yang gagal
        // decode (perilaku normal library ini, bukan error beneran) -
        // sengaja diabaikan (param error callback zxing gak dipakai di
        // sini), cuma error lain (mis. akses kamera ditolak, ditangani di
        // .catch() di bawah) yang perlu ditampilkan ke operator.
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.name === 'NotAllowedError'
            ? 'Akses kamera ditolak. Izinkan akses kamera di pengaturan browser untuk scan barcode.'
            : 'Gagal membuka kamera. Pastikan device punya kamera dan tidak dipakai aplikasi lain.'
        );
      });

    // Reset error di CLEANUP (bukan sinkron di awal effect body - react-hooks
    // lint gak suka setState sinkron langsung di body effect) - dengan
    // begini, tiap kali modal ditutup/reopen, error lama dari attempt
    // sebelumnya udah bersih SEBELUM attempt baru mulai.
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      setError(null);
    };
  }, [open, onDetected]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera size={18} />
            Scan Barcode Drawing No
          </DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="rounded-lg bg-[var(--danger-dim)] px-3.5 py-3.5 text-[13px] text-[var(--danger)]">
            {error}
          </div>
        ) : (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-[20%_12%] rounded-md border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}

        <span className="text-center text-xs text-muted-foreground">
          Arahkan kamera ke label barcode Drawing No pada part.
        </span>

        <Button type="button" variant="outline" onClick={onClose} className="mt-1">
          <X size={14} />
          Batal
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default BarcodeScannerModal;
