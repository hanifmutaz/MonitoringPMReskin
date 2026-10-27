// src/pages/PmLineCleaningPage.jsx
//
// Monitoring "Cleaning Line Tidak Running" (submenu PM Monthly and Weekly, route /pm-line/cleaning).
// Daftar Line tanpa output >= idle_min_days (Settings) lengkap dengan status cleaning-nya, plus tombol
// "Catat Cleaning" (butuh pm_line.submit). Panel & datanya sama dengan yang di Dashboard Management
// (IdleLinesPanel + useDashboardIdleLines) supaya angkanya selalu konsisten dengan Mode TV.
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useDashboardIdleLines } from '../hooks/useDashboardExtras';
import IdleLinesPanel from '../components/IdleLinesPanel';

function PmLineCleaningPage() {
  usePageHeader({ title: 'Cleaning Line Tidak Running' });
  const idle = useDashboardIdleLines();

  return (
    <div className="flex flex-col gap-4">
      {idle.isError && !idle.data ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          Gagal memuat data Line tidak running. Coba muat ulang halaman.
        </div>
      ) : (
        <IdleLinesPanel data={idle.data} isLoading={idle.isLoading} />
      )}
    </div>
  );
}

export default PmLineCleaningPage;
