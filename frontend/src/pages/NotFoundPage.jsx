// src/pages/NotFoundPage.jsx
import { useNavigate } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

// Halaman catch-all buat semua route yang belum ada implementasinya beneran
// (misal link "Lupa Password?" di LoginPage - fiturnya gak ada di backend,
// jadi daripada disembunyiin, link-nya tetap ada tapi nabrak ke sini).
// Style ngikutin referensi Mantis (doc/reskin/New folder/...maintenance-404),
// tapi ilustrasi 3D-nya diganti ikon lucide (gambar asli belum disiapin,
// lihat catatan aset visual di CHECKLIST-RESKIN.md).
function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
        <SearchX className="h-11 w-11" strokeWidth={1.5} />
      </div>

      <div className="[font-family:var(--font-display)] text-7xl font-bold tracking-tight text-foreground">
        404
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="[font-family:var(--font-display)] text-xl font-semibold text-foreground">
          Halaman Tidak Ditemukan
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Halaman yang Anda cari belum tersedia, dipindahkan, atau memang belum diimplementasikan.
        </p>
      </div>

      <Button type="button" className="h-11 px-6 text-base" onClick={() => navigate(isAuthenticated ? '/' : '/login')}>
        Kembali ke {isAuthenticated ? 'Dashboard' : 'Login'}
      </Button>
    </div>
  );
}

export default NotFoundPage;
