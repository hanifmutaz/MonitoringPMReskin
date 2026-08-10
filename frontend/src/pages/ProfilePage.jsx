// src/pages/ProfilePage.jsx
import { useState } from 'react';
import { User, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAuth } from '../contexts/AuthContext';
import * as authApi from '../api/authApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

// Halaman BARU (fitur belum ada sebelumnya - user gak punya cara sama
// sekali buat lihat/edit profil sendiri, cuma tampil read-only di footer
// Sidebar). Backend: PATCH /auth/me (full_name + email) & PATCH
// /auth/me/password (butuh current_password) - lihat authRoutes.js/
// profileService.js.
//
// SENGAJA 2 form terpisah (bukan 1 form gede) - alur validasinya beda
// total: update profil gak butuh re-auth, ganti password WAJIB
// current_password. Sukses/error tiap form juga independen, gak nyampur.
//
// username & role SENGAJA read-only di sini (kartu identitas doang, bukan
// input field) - itu domain Admin/User Management (kredensial login &
// privilege), bukan self-service. Konsisten sama whitelist ketat di backend
// (authValidator.validateUpdateProfileBody nolak field selain
// full_name/email - dicoba manual pas testing backend, field kayak role_id
// ditolak dengan pesan jelas, bukan diabaikan diam-diam).
//
// Layout REVISI (feedback via screenshot, referensi Mantis "Edit Profile"):
// awalnya 1 kolom `max-w-2xl` doang - kelihatan banyak ruang kosong di
// kanan, apalagi pas sidebar collapsed (viewport kerja jadi lebih lebar,
// makin kerasa mubazir). Sekarang grid 2 kolom kayak referensi Mantis:
// kartu identitas fixed 300px di kiri (sticky), form ngisi SISA lebar
// (`1fr`) di kanan - otomatis melebar/menyempit ngikutin sidebar
// collapsed/expanded, gak ada lagi ruang kosong yang gak kepake.

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function AlertBox({ tone, icon: Icon, children }) {
  const cls =
    tone === 'error'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : 'border-ok/30 bg-ok-dim text-ok';
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/**
 * Ekstrak pesan error dari response axios yang gagal - konsisten sama pola
 * LoginPage.jsx (err.response?.data?.message), ditambah dukungan `errors`
 * per-field (bentuk AppError.badRequest yang dipakai validator backend).
 */
function extractErrors(err, generalFallback) {
  const body = err.response?.data;
  if (body?.errors) return body.errors;
  return { _general: body?.message || generalFallback };
}

function ProfilePage() {
  usePageHeader({ title: 'Profil Saya' });
  const { user, refreshUser } = useAuth();

  const initials = (user?.full_name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // --- Form 1: update profil (full_name, email) ---
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileErrors({});
    setProfileSuccess('');
    setProfileSaving(true);
    try {
      await authApi.updateProfile({ full_name: fullName, email: email || null });
      // Re-fetch dari server (bukan cuma optimistic update state form) -
      // Sidebar footer (nama/role) ikut ke-update otomatis karena share
      // context yang sama, gak perlu re-login.
      await refreshUser();
      setProfileSuccess('Profil berhasil diubah.');
    } catch (err) {
      setProfileErrors(extractErrors(err, 'Gagal menyimpan profil.'));
    } finally {
      setProfileSaving(false);
    }
  }

  // --- Form 2: ganti password ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordErrors({});
    setPasswordSuccess('');

    // Cek konfirmasi di CLIENT dulu (UX cepat, gak perlu round-trip) -
    // backend gak tau soal confirm_password sama sekali (cuma
    // current_password & new_password), ini murni validasi form.
    if (newPassword !== confirmPassword) {
      setPasswordErrors({ confirm_password: 'Konfirmasi password tidak sama dengan password baru' });
      return;
    }

    setPasswordSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password berhasil diubah.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordErrors(extractErrors(err, 'Gagal mengganti password.'));
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_1fr]">
      {/* Kartu identitas - read-only, murni display dari session (bukan
          form). Sticky biar tetep keliatan pas kolom kanan di-scroll kalau
          form-nya panjang - pola yang sama dipakai referensi Mantis
          (kartu kiri diem, panel kanan yang discroll). */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4.5 lg:sticky lg:top-4 lg:flex-col lg:items-start lg:text-left">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dim)] text-lg font-bold text-primary">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate font-[var(--font-display)] text-lg font-semibold text-foreground">
            {user?.full_name}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
            <span>@{user?.username}</span>
            <span className="text-[var(--text-faint)]">•</span>
            <span>{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Kolom kanan: 2 form ditumpuk, ngisi sisa lebar grid (1fr) - bukan
          dibatasi max-w lagi. */}
      <div className="flex flex-col gap-5">
        {/* Form 1: Update Profil */}
        <form
          onSubmit={handleProfileSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4.5"
        >
          <h2 className="m-0 flex items-center gap-1.5 font-[var(--font-display)] text-[15px] font-semibold">
            <User size={16} />
            Informasi Profil
          </h2>

          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name">Nama Lengkap</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <FieldError message={profileErrors.full_name} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@hirose.local"
            />
            <FieldError message={profileErrors.email} />
          </div>

          {profileErrors._general && (
            <AlertBox tone="error" icon={AlertCircle}>
              {profileErrors._general}
            </AlertBox>
          )}
          {profileSuccess && (
            <AlertBox tone="success" icon={CheckCircle2}>
              {profileSuccess}
            </AlertBox>
          )}

          <div>
            <Button type="submit" disabled={profileSaving}>
              {profileSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {profileSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>

        {/* Form 2: Ganti Password */}
        <form
          onSubmit={handlePasswordSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4.5"
        >
          <h2 className="m-0 flex items-center gap-1.5 font-[var(--font-display)] text-[15px] font-semibold">
            <KeyRound size={16} />
            Ganti Password
          </h2>

          <div className="flex flex-col gap-2">
            <Label htmlFor="current_password">Password Saat Ini</Label>
            <Input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <FieldError message={passwordErrors.current_password} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="new_password">Password Baru</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <FieldError message={passwordErrors.new_password} />
            <p className="text-xs text-muted-foreground">Minimal 12 karakter, jangan sama dengan username.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm_password">Konfirmasi Password Baru</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <FieldError message={passwordErrors.confirm_password} />
          </div>

          {passwordErrors._general && (
            <AlertBox tone="error" icon={AlertCircle}>
              {passwordErrors._general}
            </AlertBox>
          )}
          {passwordSuccess && (
            <AlertBox tone="success" icon={CheckCircle2}>
              {passwordSuccess}
            </AlertBox>
          )}

          <div>
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {passwordSaving ? 'Menyimpan...' : 'Ganti Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;