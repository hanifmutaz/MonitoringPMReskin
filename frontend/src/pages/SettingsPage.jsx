// src/pages/SettingsPage.jsx
import { useState } from 'react';
import { Sliders, Award, CalendarClock, Repeat, RefreshCw, LayoutGrid, Users, Mail, Package } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';
import ToggleSwitch from '../components/ToggleSwitch';
import { Input } from '../components/ui/input';

// Reskin (checklist §6b, halaman utama terakhir yang masih tampilan lama):
// `.panel`/`.panel-header`/`.panel-title`/`.form-input` dilepas TOTAL
// (§7.3), diganti Tailwind murni - style ngikutin pattern yang udah
// established di LinesTab.jsx/DashboardPage.jsx (rounded-lg border-border
// bg-card p-4.5, judul text-[15px] font-semibold, mb-4 antara header &
// konten).
//
// ToggleSwitch.jsx SENGAJA GAK diikutkan reskin ini - dia komponen shared
// (dipakai juga di UserManagementPage.jsx), dan sesi reskin UserManagement
// sebelumnya udah EKSPLISIT nyatet skip komponen ini (lihat komentar di
// UserManagementPage.jsx). Ngikutin keputusan yang sama, bukan bikin
// keputusan baru sepihak yang malah bikin dua halaman beda konvensi.
//
// Logic (grouping kategori dari CATEGORY_META, cast value_type, save
// on-blur/on-toggle, rollback tampilan pas gagal save) TIDAK berubah sama
// sekali - cuma markup yang diganti.

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
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{SETTING_LABELS[setting.key] || setting.key}</div>
        {setting.description && <div className="text-xs text-muted-foreground">{setting.description}</div>}
        <div className="mt-0.5 font-[var(--font-mono)] text-[10px] text-[var(--text-faint)]">{setting.key}</div>
        {error && <div className="mt-0.5 text-xs text-destructive">{error}</div>}
      </div>

      <div className="shrink-0">
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
          <Input
            type="number"
            className="w-[70px] text-right font-[var(--font-mono)]"
            value={localValue}
            disabled={updateMutation.isPending}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={(e) => save(e.target.value)}
          />
        )}
        {setting.value_type === 'text' && (
          <Input
            type="text"
            className="w-[160px]"
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
    <div className="rounded-lg border border-border bg-card p-4.5">
      <h2 className="m-0 mb-1 flex items-center gap-2 font-[var(--font-display)] text-[15px] font-semibold">
        <Icon size={16} />
        <span className="font-[var(--font-mono)] text-[var(--text-faint)]">{String(meta.no).padStart(2, '0')}</span>
        {meta.title}
      </h2>
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
    return (
      <div className="rounded-lg bg-danger-dim px-4 py-5 text-center text-danger">
        Gagal memuat settings. Coba lagi.
      </div>
    );
  }
  if (isLoading) {
    return <div className="py-8 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>;
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
    <div className="flex flex-col gap-4">
      {orderedCategories.map((cat) => (
        <CategoryCard key={cat} categoryKey={cat} settings={grouped[cat]} />
      ))}
    </div>
  );
}

export default SettingsPage;
