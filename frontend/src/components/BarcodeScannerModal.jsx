// src/components/BarcodeScannerModal.jsx
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
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Camera, X } from 'lucide-react';

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
      <DialogContent className="w-[calc(100%-2rem)]" style={{ maxWidth: 420 }}>
        <DialogHeader>
          <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={18} />
            Scan Barcode Drawing No
          </DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="error-state" style={{ padding: 14, fontSize: 13 }}>
            {error}
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4 / 3',
              background: '#000',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
            <div
              style={{
                position: 'absolute',
                inset: '20% 12%',
                border: '2px solid var(--accent)',
                borderRadius: 6,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                pointerEvents: 'none',
              }}
            />
          </div>
        )}

        <span className="caption" style={{ textAlign: 'center' }}>
          Arahkan kamera ke label barcode Drawing No pada part.
        </span>

        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ marginTop: 4 }}>
          <X size={14} style={{ marginRight: 6 }} />
          Batal
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default BarcodeScannerModal;
