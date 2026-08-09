// src/components/Modal.jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

// Drop-in replacement buat Modal lama - API (title, onClose, children, width)
// PERSIS SAMA, jadi 9+ pemanggil (ClMappingModal, PartSupplierModal,
// LinesTab, PartsTab, dst) gak perlu diubah sama sekali. Yang beda cuma
// ISI-nya sekarang pakai Radix Dialog (via ui/dialog.jsx) - otomatis dapet
// focus trap, Escape-to-close, dan animasi masuk/keluar yang halus.
//
// `open` di-hardcode TRUE karena parent semua manggil Modal secara
// conditional-render ({show && <Modal ...>}) - Modal cuma ke-mount pas
// emang lagi kebuka. onOpenChange dipanggil Radix pas user nutup (Escape/klik
// overlay/klik tombol X), kita terusin ke onClose yang parent kasih.
function Modal({ title, onClose, children, width = 480 }) {
  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent style={{ maxWidth: width }} className="w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export default Modal;
