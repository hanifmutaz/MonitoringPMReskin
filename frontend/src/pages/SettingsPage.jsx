// src/pages/SettingsPage.jsx
import { useState } from 'react';
import { Sliders, Award, CalendarClock, Repeat, RefreshCw, LayoutGrid, Users, Mail, Package } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';
import ToggleSwitch from '../components/ToggleSwitch';

// Urutan & metadata 7 kategori sesuai MASTER DOCUMENT Bagian 4
// + kategori 'notifikasi' dan 'inventory' (ditambah belakangan)
const CATEGORY_META = {
  threshold_pm_part: { no: 1, title: 'Threshold PM Part', icon: Sliders },
  skema_poin_monthly: { no: 2, title: 'Skema Poin PM Monthly', icon: Award },
  threshold_monthly_weekly: { no: 3, title: 'Threshold Monthly & Weekly', icon: CalendarClock },
  relasi_monthly_weekly: { no: 4, title: 'Relasi Monthly ↔ Weekly', icon: Repeat },
  sync_data_produksi: { no: 5, title: 'Sync Data Produksi', icon: RefreshCw },
  dashboard_tampilan: { no: 6, title: 'Dashboard & Tampilan', icon: LayoutGrid },
  user_role: { no: 7, title: 'User & Role', icon: Users },
  notifikasi: { no: 8, title: 'Notifikasi Email', icon: Mail },
  inventory: { no: 9, title: 'Inventory (ROP & Safety Stock)', icon: Package },
};

// Label manusiawi per setting key — settingnya sendiri fixed catalog dari
// migration (bukan dibuat dinamis lewat UI), jadi cukup static map di sini
// tanpa perlu tambah kolom `label` ke tabel app_settings.
const SETTING_LABELS = {
  // Threshold PM Part
  pm_part_danger_multiplier: 'Pengali Danger',
  pm_part_warning_multiplier: 'Pengali Warning',
  pm_part_counter_include_reject: 'Reject Dihitung sebagai Shot Terpakai',
  // Skema Poin PM Monthly
  pm_monthly_point_full_run: 'Poin Full Run',
  pm_monthly_point_half_run: 'Poin Half Run',
  pm_monthly_point_cap: 'Batas Maksimal Poin',
  pm_monthly_min_run_count_full: 'Ambang Running untuk Full Poin',
  // Threshold Monthly & Weekly
  pm_monthly_danger_days: 'Batas Hari Danger (Monthly)',
  pm_monthly_warning_days: 'Batas Hari Warning (Monthly)',
  pm_weekly_total_days: 'Siklus PM Weekly',
  pm_weekly_danger_days: 'Batas Hari Danger (Weekly)',
  pm_weekly_warning_days: 'Batas Hari Warning (Weekly)',
  // Relasi Monthly <-> Weekly
  auto_reset_weekly_on_monthly: 'Auto-Reset Weekly saat Monthly',
  // Sync Data Produksi
  sync_interval_minutes: 'Interval Sync ke ConMas',
  sync_lookback_days: 'Rentang Hari Cache Sync',
  // Dashboard & Tampilan
  dashboard_upcoming_pm_limit: 'Jumlah Item Upcoming PM',
  dashboard_default_view: 'Filter Default Dashboard',
  // User & Role
  session_timeout_minutes: 'Timeout Sesi (Idle)',
  allow_operator_edit_master_data: 'Operator Boleh Edit Master Data',
  // Notifikasi
  notif_pm_part_enabled: 'Notifikasi Email PM Part',
  notif_pm_part_recipient_roles: 'Role Penerima Notifikasi PM Part',
  notif_pm_part_interval_hours: 'Jeda Reminder PM Part (jam)',
  notif_pm_part_repeat: 'Ulangi Reminder PM Part',
  notif_inventory_enabled: 'Notifikasi Email Inventory',
  notif_inventory_recipient_roles: 'Role Penerima Notifikasi Inventory',
  notif_inventory_interval_hours: 'Jeda Reminder Inventory (jam)',
  notif_inventory_repeat: 'Ulangi Reminder Inventory',
  // Inventory
  inventory_safety_stock_percentage: 'Persentase Safety Stock',
};

function SettingRow({ setting }) {
  const updateMutation = useUpdateSetting();
  const [localValue, setLocalValue] = useState(setting.value);
  const [error, setError] = useState('');

  async function save(rawValue) {
    setError('');
    let castedValue = rawValue;
    if (setting.value_type === 'number') castedValue = Number(rawValue);
    if (setting.value_type === 'boolean') castedValue = rawValue === true || rawValue === 'true';

    try {
      await updateMutation.mutateAsync({ key: setting.key, value: castedValue });
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan');
      setLocalValue(setting.value); // rollback tampilan ke nilai server
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid var(--border-soft)',
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {SETTING_LABELS[setting.key] || setting.key}
        </div>
        {setting.description && <div className="caption">{setting.description}</div>}
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
          {setting.key}
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 2 }}>{error}</div>}
      </div>

      <div style={{ flexShrink: 0 }}>
        {setting.value_type === 'boolean' && (
          <ToggleSwitch
            checked={localValue === 'true' || localValue === true}
            disabled={updateMutation.isPending}
            onChange={(next) => {
              setLocalValue(next);
              save(next);
            }}
          />
        )}
        {setting.value_type === 'number' && (
          <input
            type="number"
            className="form-input mono"
            style={{ width: 70, textAlign: 'right' }}
            value={localValue}
            disabled={updateMutation.isPending}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={(e) => save(e.target.value)}
          />
        )}
        {setting.value_type === 'text' && (
          <input
            type="text"
            className="form-input"
            style={{ width: 160 }}
            value={localValue}
            disabled={updateMutation.isPending}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={(e) => save(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

function CategoryCard({ categoryKey, settings }) {
  const meta = CATEGORY_META[categoryKey] || { no: '-', title: categoryKey, icon: Sliders };
  const Icon = meta.icon;
  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={16} />
          <span className="mono" style={{ color: 'var(--text-faint)' }}>
            {String(meta.no).padStart(2, '0')}
          </span>
          {meta.title}
        </h2>
      </div>
      {settings.map((s) => (
        <SettingRow key={s.key} setting={s} />
      ))}
    </div>
  );
}

function SettingsPage() {
  usePageHeader({ title: 'Settings' });
  const { data, isLoading, isError } = useSettings();

  if (isError) {
    return <div className="error-state">Gagal memuat settings. Coba lagi.</div>;
  }
  if (isLoading) {
    return <div className="empty-state">Memuat data...</div>;
  }

  const grouped = {};
  for (const s of data) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  const orderedCategories = Object.keys(grouped).sort(
    (a, b) => (CATEGORY_META[a]?.no || 99) - (CATEGORY_META[b]?.no || 99)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {orderedCategories.map((cat) => (
        <CategoryCard key={cat} categoryKey={cat} settings={grouped[cat]} />
      ))}
    </div>
  );
}

export default SettingsPage;