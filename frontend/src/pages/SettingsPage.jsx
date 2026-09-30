// src/pages/SettingsPage.jsx
import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { RefreshCw, Pencil, Check, X, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings, useUpdateSetting, useUpdateSettingAccess, useSyncConmasNow, useCanAccessSettings } from '../hooks/useSettings';
import ForbiddenState from '../components/ForbiddenState';
import { CATEGORY_META, DEFAULT_SETTINGS_MENU_KEY, findSettingsMenu } from '../components/settings/settingsCategories';
import { useRoles } from '../hooks/useRoles';
import ToggleSwitch from '../components/ToggleSwitch';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

// Label manusiawi per setting key — settingnya sendiri fixed catalog dari
// migration (bukan dibuat dinamis lewat UI), jadi cukup static map di sini
// tanpa perlu tambah kolom `label` ke tabel app_settings.
const SETTING_LABELS = {
  // Batas Status Part
  pm_part_danger_multiplier: 'Batas Danger (sisa hari pakai)',
  pm_part_warning_multiplier: 'Batas Warning (sisa hari pakai)',
  pm_part_counter_include_reject: 'Hitung Reject sebagai Pemakaian',
  // Poin PM Monthly
  pm_monthly_point_full_run: 'Poin per Full Run',
  pm_monthly_point_cap: 'Poin Maksimal',
  // Poin PM Weekly
  pm_weekly_point_full_run: 'Poin per Full Run',
  // Batas Status Monthly & Weekly
  pm_monthly_danger_days: 'Batas Danger Monthly (hari)',
  pm_monthly_warning_days: 'Batas Warning Monthly (hari)',
  pm_weekly_total_days: 'Lama Siklus Weekly (hari)',
  pm_weekly_danger_days: 'Batas Danger Weekly (hari)',
  pm_weekly_warning_days: 'Batas Warning Weekly (hari)',
  // Hubungan Monthly & Weekly
  auto_reset_weekly_on_monthly: 'Reset Weekly Otomatis saat Monthly',
  // Sinkron Data Produksi
  sync_interval_minutes: 'Jeda Sinkron ke ConMas',
  sync_lookback_days: 'Data Produksi yang Disimpan (hari)',
  // Tampilan Dashboard
  dashboard_upcoming_pm_limit: 'Jumlah PM Mendatang di Dashboard',
  dashboard_default_view: 'Tampilan Awal Dashboard',
  // Akses & Sesi
  session_timeout_minutes: 'Batas Waktu Tidak Aktif (menit)',
  // Notifikasi Email
  notif_pm_part_enabled: 'Kirim Email PM Part',
  notif_pm_part_recipient_roles: 'Penerima Email PM Part',
  notif_pm_part_interval_hours: 'Jeda Pengingat PM Part (jam)',
  notif_pm_part_repeat: 'Ulangi Pengingat PM Part',
  notif_inventory_enabled: 'Kirim Email Inventory',
  notif_inventory_recipient_roles: 'Penerima Email Inventory',
  notif_inventory_interval_hours: 'Jeda Pengingat Inventory (jam)',
  notif_inventory_repeat: 'Ulangi Pengingat Inventory',
  // Stok Pengaman
  inventory_safety_stock_percentage: 'Persen Stok Pengaman',
};

function displayValue(setting) {
  if (setting.value_type === 'boolean') return setting.value === 'true' || setting.value === true ? 'Ya' : 'Tidak';
  return String(setting.value);
}

// Popover kecil Admin-only buat ngatur role non-Admin mana yang boleh edit
// 1 setting key (setting_role_access, migration 1700000022000). Admin
// sendiri gak perlu row di sini - selalu superuser.
function RoleAccessEditor({ setting, onClose }) {
  const { data: roles = [] } = useRoles();
  const updateAccess = useUpdateSettingAccess();
  const [draft, setDraft] = useState(setting.editable_role_ids || []);
  const [error, setError] = useState('');

  const grantableRoles = roles.filter((r) => r.name !== 'Admin');

  function toggle(roleId) {
    setDraft((prev) => (prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]));
  }

  async function save() {
    setError('');
    try {
      await updateAccess.mutateAsync({ key: setting.key, roleIds: draft });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal simpan akses role');
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-2)] p-2.5">
      <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
        Role lain yang boleh edit setting ini (Admin selalu boleh)
      </div>
      {grantableRoles.length === 0 && (
        <div className="text-[11px] text-[var(--text-faint)]">Belum ada role lain selain Admin/Operator.</div>
      )}
      <div className="flex flex-wrap gap-2">
        {grantableRoles.map((r) => (
          <label key={r.id} className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={draft.includes(r.id)}
              onChange={() => toggle(r.id)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            {r.name}
          </label>
        ))}
      </div>
      {error && <div className="mt-1.5 text-[11px] text-destructive">{error}</div>}
      <div className="mt-2 flex gap-1.5">
        <Button type="button" size="sm" onClick={save} disabled={updateAccess.isPending}>
          {updateAccess.isPending ? 'Menyimpan...' : 'Simpan Akses'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Batal
        </Button>
      </div>
    </div>
  );
}

function SettingRow({ setting, canEdit, isAdmin }) {
  const updateMutation = useUpdateSetting();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(setting.value);
  const [error, setError] = useState('');
  const [showAccessEditor, setShowAccessEditor] = useState(false);

  function startEdit() {
    setLocalValue(setting.value);
    setError('');
    setIsEditing(true);
  }

  function cancelEdit() {
    setLocalValue(setting.value);
    setError('');
    setIsEditing(false);
  }

  async function save() {
    setError('');
    let castedValue = localValue;
    if (setting.value_type === 'number') castedValue = Number(localValue);
    if (setting.value_type === 'boolean') castedValue = localValue === true || localValue === 'true';

    try {
      await updateMutation.mutateAsync({ key: setting.key, value: castedValue });
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan');
    }
  }

  const grantedToOtherRoles = (setting.editable_role_ids || []).length > 0;

  return (
    <div className="border-b border-[var(--border-soft)] py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13px] font-medium">
            {SETTING_LABELS[setting.key] || setting.key}
            {!canEdit && <Lock size={11} className="text-[var(--text-faint)]" aria-label="Read-only" />}
          </div>
          {setting.description && <div className="text-xs text-muted-foreground">{setting.description}</div>}
          {/* Nama teknis (key) cuma berguna buat Admin - disembunyikan dari
              role lain biar tampilan tidak ramai. */}
          {isAdmin && (
            <div className="mt-0.5 font-[var(--font-mono)] text-[10px] text-[var(--text-faint)]">{setting.key}</div>
          )}
          {error && <div className="mt-0.5 text-xs text-destructive">{error}</div>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isEditing && (
            <>
              <span className="font-[var(--font-mono)] text-[13px]">{displayValue(setting)}</span>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Edit ${SETTING_LABELS[setting.key] || setting.key}`}
                  onClick={startEdit}
                >
                  <Pencil size={13} />
                </Button>
              )}
              {isAdmin && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${grantedToOtherRoles ? 'text-[var(--accent)]' : ''}`}
                  aria-label={`Atur akses role untuk ${SETTING_LABELS[setting.key] || setting.key}`}
                  onClick={() => setShowAccessEditor((v) => !v)}
                >
                  <ShieldCheck size={13} />
                </Button>
              )}
            </>
          )}

          {isEditing && (
            <>
              {setting.value_type === 'boolean' && (
                <ToggleSwitch
                  checked={localValue === 'true' || localValue === true}
                  disabled={updateMutation.isPending}
                  label={SETTING_LABELS[setting.key] || setting.key}
                  onChange={(next) => setLocalValue(next)}
                />
              )}
              {setting.value_type === 'number' && (
                <Input
                  type="number"
                  className="w-[70px] text-right font-[var(--font-mono)]"
                  value={localValue}
                  disabled={updateMutation.isPending}
                  onChange={(e) => setLocalValue(e.target.value)}
                  autoFocus
                />
              )}
              {setting.value_type === 'text' && (
                <Input
                  type="text"
                  className="w-[160px]"
                  value={localValue}
                  disabled={updateMutation.isPending}
                  onChange={(e) => setLocalValue(e.target.value)}
                  autoFocus
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[var(--ok)]"
                aria-label="Simpan"
                disabled={updateMutation.isPending}
                onClick={save}
              >
                {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Batal"
                disabled={updateMutation.isPending}
                onClick={cancelEdit}
              >
                <X size={15} />
              </Button>
            </>
          )}
        </div>
      </div>

      {showAccessEditor && <RoleAccessEditor setting={setting} onClose={() => setShowAccessEditor(false)} />}
    </div>
  );
}

function SyncNowButton() {
  const syncNow = useSyncConmasNow();
  const [result, setResult] = useState(null);

  async function handleSync() {
    setResult(null);
    try {
      const data = await syncNow.mutateAsync();
      if (data?.skipped) {
        setResult({ ok: false, text: 'Dilewati - kredensial ConMas belum diisi di .env' });
      } else if (data?.error) {
        setResult({ ok: false, text: 'Sync gagal, cek log server' });
      } else {
        setResult({ ok: true, text: `Selesai - ${data?.rowsSynced ?? 0} baris ter-sync` });
      }
    } catch (err) {
      setResult({ ok: false, text: err.response?.data?.message || 'Sync gagal' });
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className={`text-xs ${result.ok ? 'text-[var(--ok)]' : 'text-destructive'}`}>{result.text}</span>
      )}
      <Button type="button" size="sm" variant="outline" onClick={handleSync} disabled={syncNow.isPending}>
        {syncNow.isPending ? (
          <>
            <Loader2 size={13} className="animate-spin" /> Sync...
          </>
        ) : (
          <>
            <RefreshCw size={13} /> Sync Sekarang
          </>
        )}
      </Button>
    </div>
  );
}

function CategoryCard({ categoryKey, settings, isAdmin, userRoleId }) {
  const meta = CATEGORY_META[categoryKey] || { title: categoryKey };
  return (
    <div className="rounded-xl border border-border bg-card p-4.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="m-0 font-[var(--font-display)] text-[15px] font-semibold">{meta.title}</h2>
        {/* Tombol manual sync cuma relevan & cuma boleh dipakai Admin (route
            POST /settings/sync-conmas Admin only) - taruh di header kategori
            "Sinkron Data Produksi" biar dekat sama setting jedanya. */}
        {categoryKey === 'sync_data_produksi' && isAdmin && <SyncNowButton />}
      </div>
      {settings.map((s) => (
        <SettingRow
          key={s.key}
          setting={s}
          isAdmin={isAdmin}
          canEdit={isAdmin || (s.editable_role_ids || []).includes(userRoleId)}
        />
      ))}
    </div>
  );
}

function SettingsPage() {
  const { menu } = useParams();
  const { user, isAdmin } = useAuth();
  const { canAccess, isLoading: accessLoading } = useCanAccessSettings();
  const { data, isLoading, isError } = useSettings();

  const activeMenu = menu ? findSettingsMenu(menu) : null;
  usePageHeader({ title: activeMenu ? `Settings ${activeMenu.title}` : 'Settings' });

  // Role tanpa grant apa pun: menu Settings disembunyikan di Sidebar, dan
  // kalau URL-nya diketik langsung tampil "Akses ditolak" (bukan redirect
  // ke Dashboard). Tunggu useCanAccessSettings selesai dulu biar gak
  // kedip "ditolak" sesaat pas data settings masih dimuat.
  if (accessLoading) {
    return <div className="py-8 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>;
  }
  if (!canAccess) {
    return <ForbiddenState />;
  }

  // /settings (tanpa submenu) atau key yang tidak dikenal -> submenu pertama.
  // Key kategori lama (/settings/threshold_pm_part) -> submenu yang
  // sekarang menampung kategori itu.
  if (!activeMenu) {
    return <Navigate to={`/settings/${DEFAULT_SETTINGS_MENU_KEY}`} replace />;
  }
  if (activeMenu.key !== menu) {
    return <Navigate to={`/settings/${activeMenu.key}`} replace />;
  }

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

  return (
    <div className="flex flex-col gap-4">
      {!isAdmin && (
        <div className="rounded-lg bg-[var(--panel-2)] px-3.5 py-2.5 text-xs text-muted-foreground">
          Anda hanya bisa mengubah setting yang sudah diizinkan Admin untuk role Anda. Sisanya hanya bisa dilihat.
        </div>
      )}
      {activeMenu.categories.map((cat) => {
        const categorySettings = data.filter((s) => s.category === cat);
        if (categorySettings.length === 0) return null;
        return (
          <CategoryCard key={cat} categoryKey={cat} settings={categorySettings} isAdmin={isAdmin} userRoleId={user?.role_id} />
        );
      })}
    </div>
  );
}

export default SettingsPage;
