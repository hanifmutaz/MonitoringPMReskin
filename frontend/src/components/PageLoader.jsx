// src/components/PageLoader.jsx
//
// Fallback <Suspense> untuk halaman yang di-lazy-load lewat React.lazy()
// (lihat App.jsx). Cuma tampil sekejap saat chunk JS halaman itu di-fetch
// pertama kali - sesudahnya browser cache, jadi navigasi berikutnya ke
// halaman yang sama gak nge-flash lagi.
import { Loader2 } from 'lucide-react';

function PageLoader() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default PageLoader;
