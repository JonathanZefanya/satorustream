import { Bookmark, BookmarkCheck, Loader2, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/authContext'
import { addToWatchlist, isInWatchlistLocally, removeFromWatchlist } from '../services/userLibrary'

interface WishlistButtonProps {
  animeSlug: string
  title?: string
  poster?: string
  className?: string
}

const WishlistButton = ({ animeSlug, title, poster, className = '' }: WishlistButtonProps) => {
  const { user, enabled } = useAuth()
  const location = useLocation()

  // Status awal dibaca dari cermin lokal supaya tombol langsung tepat tanpa
  // menunggu jaringan; perubahan berikutnya dikendalikan state ini.
  const [saved, setSaved] = useState(() => (user ? isInWatchlistLocally(animeSlug) : false))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Wishlist terikat akun. Tanpa Supabase terkonfigurasi fiturnya tidak ada
  // sama sekali, jadi tombolnya tidak ditampilkan.
  if (!enabled) {
    return null
  }

  if (!user) {
    return (
      <Link
        to="/login"
        state={{ from: location.pathname + location.search }}
        className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${className}`}
      >
        <LogIn className="h-4 w-4" />
        Masuk untuk simpan
      </Link>
    )
  }

  const handleToggle = async () => {
    if (busy || !animeSlug) {
      return
    }

    const next = !saved
    setBusy(true)
    setError(null)
    setSaved(next)

    try {
      if (next) {
        await addToWatchlist({ animeSlug, title, poster }, user.id)
      } else {
        await removeFromWatchlist(animeSlug, user.id)
      }
    } catch (err) {
      setSaved(!next)
      setError(err instanceof Error ? err.message : 'Gagal memperbarui wishlist.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={busy}
        aria-pressed={saved}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          saved
            ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
            : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <BookmarkCheck className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
        {saved ? 'Tersimpan' : 'Simpan ke Wishlist'}
      </button>

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  )
}

export default WishlistButton
