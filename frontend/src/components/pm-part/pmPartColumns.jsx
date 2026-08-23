// src/components/pm-part/pmPartColumns.jsx
// Extracted from pages/PmPartMonitoringPage.jsx (docs/frontend/
// MIGRATION-PLAN.md Phase 7 - domain/pm-part/ extraction). Was a local
// buildColumns() function defined inline in the page file; column
// definitions and cell markup are unchanged, only the location (and
// therefore WearRing/StatusBadge/Button import paths) moves.
//
// Function, not a static array: the last column's action button needs
// onGantiPart from the page's component state, so columns are built
// per-render by the caller rather than exported as a module constant.
import { Truck } from 'lucide-react';
import WearRing from './WearRing';
import StatusBadge from '../data-display/StatusBadge';
import { Button } from '../ui/button';

function buildPmPartColumns(onGantiPart) {
  return [
    {
      key: 'wear',
      header: '',
      render: (item) => <WearRing percentage={item.wear_percentage} status={item.status} />,
    },
    {
      key: 'line',
      header: 'Line',
      render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{item.line_name}</span>,
    },
    {
      key: 'part',
      header: 'Drawing No / Part Name',
      render: (item) => (
        <>
          <div className="text-[13px]">{item.part_name}</div>
          <div className="font-[var(--font-mono)] text-xs text-[var(--text-dim)]">
            {item.drawing_no} <span className="text-[var(--text-faint)]">({item.jig_name})</span>
          </div>
          {item.primary_supplier_name ? (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-[var(--text-dim)]">
              <Truck size={11} /> {item.primary_supplier_name}
            </div>
          ) : (
            <div className="mt-0.5 text-xs text-[var(--text-faint)]">Belum ada Supplier utama</div>
          )}
        </>
      ),
    },
    {
      key: 'counter',
      header: 'Counter',
      align: 'right',
      render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{item.counter.toLocaleString('id-ID')}</span>,
    },
    {
      key: 'target_shot',
      header: 'Target Shot',
      align: 'right',
      render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{item.target_shot.toLocaleString('id-ID')}</span>,
    },
    {
      key: 'remaining_shot',
      header: 'Sisa Shot',
      align: 'right',
      render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{item.remaining_shot.toLocaleString('id-ID')}</span>,
    },
    {
      key: 'estimated_pm_date',
      header: 'Estimasi PM',
      render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{item.estimated_pm_date || '-'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (item) => (
        <Button type="button" size="sm" variant="outline" onClick={() => onGantiPart(item)}>
          Ganti Part
        </Button>
      ),
    },
  ];
}

export default buildPmPartColumns;
