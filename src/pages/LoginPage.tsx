import { LogIn, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContext'
import { useSeo } from '../hooks/useSeo'

type Mode = 'signin' | 'signup'

const LoginPage = () => {
  const { user, loading, enabled, signIn, signUp } = useAuth()

  useSeo({
    title: 'Masuk atau Daftar',
    description: 'Masuk ke akun SatoruStream untuk menyimpan wishlist dan riwayat tontonan lintas perangkat.',
    canonicalPath: '/login',
    noIndex: true,
  })
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)

    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
        navigate(redirectTo, { replace: true })
        return
      }

      const { needsConfirmation } = await signUp(email.trim(), password, displayName.trim())

      if (needsConfirmation) {
        setNotice('Akun dibuat. Cek email kamu untuk tautan konfirmasi sebelum masuk.')
        setMode('signin')
        return
      }

      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!enabled) {
    return (
      <div className="container-app py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          <p className="font-semibold">Fitur akun belum dikonfigurasi.</p>
          <p className="mt-2">
            Isi <code className="font-mono">VITE_SUPABASE_URL</code> dan{' '}
            <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>, lalu jalankan{' '}
            <code className="font-mono">supabase-user-schema.sql</code> di Supabase SQL Editor.
          </p>
          <p className="mt-2">
            Tanpa itu wishlist dan riwayat tetap berjalan, tapi hanya tersimpan di perangkat ini.
          </p>
        </div>
      </div>
    )
  }

  const isSignup = mode === 'signup'

  return (
    <div className="container-app py-10">
      <div className="mx-auto max-w-md surface-panel p-6 sm:p-7">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {isSignup ? 'Buat akun' : 'Masuk'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isSignup
            ? 'Simpan wishlist dan riwayat tontonan supaya ikut berpindah antar perangkat.'
            : 'Lanjutkan dengan akun yang sudah kamu punya.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          {isSignup && (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Nama tampilan
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="nickname"
                placeholder="Opsional"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
          )}

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Kata sandi
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            {isSignup && (
              <span className="mt-1 block text-xs text-slate-400">Minimal 6 karakter.</span>
            )}
          </label>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {notice && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSignup ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {submitting ? 'Memproses...' : isSignup ? 'Daftar' : 'Masuk'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          {isSignup ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? 'signin' : 'signup')
              setError(null)
              setNotice(null)
            }}
            className="font-semibold text-rose-600 hover:underline"
          >
            {isSignup ? 'Masuk' : 'Daftar'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
