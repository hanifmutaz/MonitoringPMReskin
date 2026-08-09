// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

// Halaman ini SENGAJA gak reuse .brand-mark/.brand-text-title dari
// components.css (itu dipakai Sidebar.jsx juga) - brand mark di sini dibuat
// baru pakai Tailwind murni biar redesign ini gak nyenggol tampilan Sidebar
// yang belum dimigrasi. Semua logic auth (login, redirect, error handling)
// PERSIS SAMA kayak sebelumnya - cuma markup/styling yang diganti.
//
// TIDAK ada "Keep me signed in" atau "Forgot Password?" di sini walaupun
// lazim ada di template login - backend belum punya fitur itu (session
// selalu sama durasinya, gak ada endpoint reset password). Nambahin kontrol
// UI yang gak beneran ngapa-ngapain itu bohong ke user, jadi sengaja dilewatin.
function BackgroundDecoration() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute -left-32 bottom-0 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'var(--accent)' }}
      />
      <div
        className="absolute -left-10 bottom-20 h-[280px] w-[280px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'var(--ok)' }}
      />
      <div
        className="absolute left-40 -bottom-20 h-[260px] w-[260px] rounded-full opacity-10 blur-3xl"
        style={{ background: 'var(--danger)' }}
      />
    </div>
  );
}

function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Username atau password salah');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <BackgroundDecoration />

      {/* Logo di pojok kiri atas halaman - bukan di atas card */}
      <div className="fixed left-6 top-6 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          H
        </div>
        <span className="[font-family:var(--font-display)] text-base font-semibold text-foreground">
          PM Monitor
        </span>
      </div>

      <div className="relative w-full max-w-[420px] rounded-xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-7 flex items-start justify-between">
          <h1 className="[font-family:var(--font-display)] text-2xl font-bold text-foreground">Login</h1>
          <Link to="/register" className="mt-2 text-sm text-primary hover:underline">
            Belum punya akun?
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              className="h-11"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="h-11 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={submitting} className="h-11 w-full text-base">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Memproses...' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;