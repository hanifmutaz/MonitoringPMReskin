// src/layouts/MainLayout.jsx
//
// <main> (Phase 15 a11y fix, real browser confirmation via axe-core): WCAG
// landmark-one-main - dokumen HTML nggak punya landmark <main> sama sekali
// sebelumnya (content-area cuma <div> biasa), jadi screen reader user gak
// bisa "lompat langsung" ke konten utama tiap halaman. Karena MainLayout
// ini SATU titik yang dipakai SEMUA halaman (Outlet render di sini), fix
// di 1 tempat ini otomatis nutup landmark-one-main untuk seluruh app - dan
// juga menutup sebagian besar `region` violation (konten yang tadinya "not
// contained by landmarks" sekarang otomatis masuk <main>). Sidebar/Topbar/
// FooterStatusBar TIDAK dibungkus <main> - itu genuinely bukan "konten
// utama", biar screen reader masih bisa bedain nav/chrome vs isi halaman.
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import FooterStatusBar from '../components/FooterStatusBar';
import { PageHeaderProvider } from '../contexts/PageHeaderContext';
import { SidebarProvider } from '../contexts/SidebarContext';

function MainLayout() {
  return (
    <SidebarProvider>
      <PageHeaderProvider>
        <div className="app-shell">
          <Sidebar />
          <div className="main-column">
            <Topbar />
            <main className="content-area">
              <Outlet />
            </main>
            <FooterStatusBar />
          </div>
        </div>
      </PageHeaderProvider>
    </SidebarProvider>
  );
}

export default MainLayout;