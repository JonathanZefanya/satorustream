import { Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import SignInPrompt from '../components/SignInPrompt'
import { CardSkeleton } from '../components/Skeletons'
import { useAuth } from '../contexts/authContext'
import { useSource } from '../contexts/sourceContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { getWatchlist, removeFromWatchlist, type WatchlistEntry } from '../services/userLibrary'

const WishlistPage = () => {
  const { user, loading: authLoading } = useAuth()
  const { sourceId } = useSource()
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchWatchlist = useCallback(() => getWatchlist(user?.id), [user?.id])
  const { data, loading, error, reload, setData } = useAsyncData(fetchWatchlist, {
    enabled: !authLoading && Boolean(user),
  })

  const handleRemove = async (entry: WatchlistEntry) => {
    const key = `${entry.sourceId}:${entry.animeSlug}`
    setRemoving(key)

    try {
      await removeFromWatchlist(entry.animeSlug, user?.id, entry.sourceId)
      setData((current) =>
        (current ?? []).filter(
          (item) => !(item.sourceId === entry.sourceId && item.animeSlug === entry.animeSlug),
        ),
      )
    } finally {
      setRemoving(null)
    }
  }

  const entries = data ?? []

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="section-title">Wishlist</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tersimpan di akun kamu dan ikut berpindah antar perangkat.
          </p>
        </div>
        {user && (
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Refresh
        </button>
        )}
      </div>

      {!authLoading && !user && (
        <SignInPrompt
          feature="Wishlist"
          description="Simpan anime yang ingin kamu tonton nanti, lalu buka kembali dari perangkat mana pun."
        />
      )}

      {user && loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <CardSkeleton count={6} />
        </div>
      )}

      {user && !loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Gagal memuat wishlist.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {user && !loading && !error && entries.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Wishlist masih kosong. Buka halaman detail anime lalu tekan{' '}
          <span className="font-semibold">Simpan ke Wishlist</span>.
        </div>
      )}

      {user && !loading && !error && entries.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {entries.map((entry) => {
            const key = `${entry.sourceId}:${entry.animeSlug}`
            // Slug hanya berlaku di sumber asalnya, jadi entri dari sumber lain
            // ditampilkan tanpa tautan agar tidak menuju halaman kosong.
            const sameSource = entry.sourceId === sourceId

            return (
              <article key={key} className="group">
                <div className="relative overflow-hidden rounded-xl aspect-[3/4]">
                  <img
                    src={entry.poster || 'https://placehold.co/480x640?text=No+Image'}
                    alt={entry.title || 'Anime poster'}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {!sameSource && (
                    <span className="absolute left-2 top-2 rounded-md bg-slate-900/85 px-2 py-1 text-[11px] font-semibold text-white">
                      {entry.sourceId}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleRemove(entry)}
                    disabled={removing === key}
                    aria-label="Hapus dari wishlist"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/80 text-white transition hover:bg-rose-600 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {sameSource ? (
                  <Link
                    to={`/anime/${entry.animeSlug}`}
                    className="line-clamp-2 pt-2 text-sm font-semibold leading-5 text-slate-900 hover:text-rose-600 dark:text-slate-100"
                  >
                    {entry.title || 'Untitled Anime'}
                  </Link>
                ) : (
                  <p
                    title={`Disimpan dari sumber ${entry.sourceId}. Ganti pemilih Sumber di atas untuk membukanya.`}
                    className="line-clamp-2 pt-2 text-sm font-semibold leading-5 text-slate-400"
                  >
                    {entry.title || 'Untitled Anime'}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default WishlistPage
