import { LogIn } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/authContext'

interface SignInPromptProps {
  /** Nama fitur yang membutuhkan akun, mis. "Wishlist". */
  feature: string
  description: string
}

/**
 * Ditampilkan pada halaman yang memerlukan akun. Kalau Supabase memang belum
 * dikonfigurasi, pesannya diarahkan ke langkah setup, bukan ke tombol masuk
 * yang tidak akan berfungsi.
 */
const SignInPrompt = ({ feature, description }: SignInPromptProps) => {
  const { enabled } = useAuth()
  const location = useLocation()

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        <p className="font-semibold">{feature} belum tersedia.</p>
        <p className="mt-1">
          Fitur akun butuh <code className="font-mono">VITE_SUPABASE_URL</code> dan{' '}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>, lalu jalankan{' '}
          <code className="font-mono">supabase-user-schema.sql</code> di Supabase SQL Editor.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-base font-bold text-slate-900 dark:text-slate-100">
        {feature} tersimpan di akun kamu
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
      <Link
        to="/login"
        state={{ from: location.pathname + location.search }}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600"
      >
        <LogIn className="h-4 w-4" />
        Masuk atau daftar
      </Link>
    </div>
  )
}

export default SignInPrompt
