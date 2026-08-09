// src/layouts/MainLayout.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import FooterStatusBar from '../components/FooterStatusBar';
import { PageHeaderProvider } from '../contexts/PageHeaderContext';

function MainLayout() {
  return (
    <PageHeaderProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="main-column">
          <Topbar />
          <div className="content-area">
            <Outlet />
          </div>
          <FooterStatusBar />
        </div>
      </div>
    </PageHeaderProvider>
  );
}

export default MainLayout;
