// src/pages/MasterDataPage.jsx
import { useState } from 'react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import LinesTab from '../components/masterdata/LinesTab';
import PartsTab from '../components/masterdata/PartsTab';
import SuppliersTab from '../components/masterdata/SuppliersTab';
import ImportMasterDataTab from '../components/masterdata/ImportMasterDataTab';

const TABS = [
  { key: 'lines', label: 'Lines' },
  { key: 'parts', label: 'Parts' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'import', label: 'Import Excel' },
];

function MasterDataPage() {
  usePageHeader({ title: 'Master Data Part' });
  const [activeTab, setActiveTab] = useState('lines');

  return (
    <div className="panel">
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-item${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'lines' && <LinesTab />}
      {activeTab === 'parts' && <PartsTab />}
      {activeTab === 'suppliers' && <SuppliersTab />}
      {activeTab === 'import' && <ImportMasterDataTab />}
    </div>
  );
}

export default MasterDataPage;