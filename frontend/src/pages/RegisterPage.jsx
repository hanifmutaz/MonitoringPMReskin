// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { register } from '../api/authApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const emptyForm = { username: '', full_name: '', email: '', password: '', confirmPassword: '' };

// Sama gaya kayak LoginPage.jsx (logo pojok, blob dekoratif, card header
// title+link sejajar) - ditulis independen, bukan shared component, karena
// cuma dipakai di 2 tempat ini. Semua logic validasi/submit gak berubah.
// Sama gaya kayak LoginPage.jsx (logo pojok, foto blur dekoratif, card header
// title+link sejajar) - ditulis independen, bukan shared component, karena
// cuma dipakai di 2 tempat ini. Semua logic validasi/submit gak berubah.
// Foto asli di frontend/public/auth-bg.jpg, full-cover + blur + overlay
// gelap (bukan bulatan kecil di pojok).
function BackgroundDecoration() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <img
        src="/auth-bg.jpg"
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
      />
      <div className="absolute inset-0 bg-background/70" />
    </div>
  );
}

// Gambar asli, bukan placeholder huruf - lihat frontend/public/logo.svg.
function Logo() {
  return (
    <div className="fixed left-6 top-6 flex items-center gap-2.5">
      <img src="/logo.svg" alt="PM Monitor" className="h-8 w-auto" />
      <span className="[font-family:var(--font-display)] text-base font-semibold text-foreground">PM Monitor</span>
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <span className="text-xs text-destructive">{message}</span>;
}

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: 'Konfirmasi password tidak sama' });
      return;
    }

    setSubmitting(true);
    try {
      await register({
        username: form.username,
        full_name: form.full_name,
        email: form.email || undefined,
        password: form.password,
      });
      setSuccess(true);
    } catch (err) {
      setErrors(err.response?.data?.errors || { _general: err.response?.data?.message || 'Gagal mendaftar' });
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
        <BackgroundDecoration />
        <Logo />
        <div className="relative flex w-full max-w-[420px] flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ok-dim text-ok">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="[font-family:var(--font-display)] text-lg font-semibold text-foreground">
            Registrasi berhasil
          </div>
          <p className="text-sm text-muted-foreground">
            Akun Anda sudah dibuat dan sedang menunggu persetujuan Admin. Anda akan bisa login setelah disetujui.
          </p>
          <Button type="button" className="h-11 w-full text-base" onClick={() => navigate('/login')}>
            Kembali ke Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <BackgroundDecoration />
      <Logo />

      <div className="relative w-full max-w-[420px] rounded-xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-7 flex items-start justify-between">
          <h1 className="[font-family:var(--font-display)] text-2xl font-bold text-foreground">Daftar</h1>
          <Link to="/login" className="mt-2 text-sm text-primary hover:underline">
            Sudah punya akun?
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              className="h-11"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              autoFocus
              required
            />
            <FieldError message={errors.username} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Nama Lengkap</Label>
            <Input
              id="full_name"
              className="h-11"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              autoComplete="name"
              required
            />
            <FieldError message={errors.full_name} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email (opsional)</Label>
            <Input
              id="email"
              type="email"
              className="h-11"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <FieldError message={errors.email} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="h-11 pr-10"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-muted-foreground [appearance:none] hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError message={errors.password} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              className="h-11"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              autoComplete="new-password"
              required
            />
            <FieldError message={errors.confirmPassword} />
          </div>

          {errors._general && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors._general}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="h-11 w-full text-base">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Mendaftar...' : 'Daftar'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;