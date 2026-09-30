// src/components/ForbiddenState.jsx
// Ditampilkan saat user login tapi tidak punya hak akses ke halaman -
// menggantikan redirect diam-diam ke Dashboard (user bingung kenapa menu
// yang diklik malah pindah ke Dashboard).
import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

function ForbiddenState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-dim text-danger">
        <ShieldOff size={22} />
      </div>
      <h2 className="m-0 font-[var(--font-display)] text-lg font-semibold">Akses ditolak</h2>
      <p className="m-0 max-w-sm text-sm text-muted-foreground">
        Role Anda tidak punya akses ke halaman ini. Hubungi Admin kalau Anda merasa perlu akses.
      </p>
      <Link to="/" className="text-sm font-medium text-primary no-underline hover:underline">
        Kembali ke Dashboard
      </Link>
    </div>
  );
}

export default ForbiddenState;
