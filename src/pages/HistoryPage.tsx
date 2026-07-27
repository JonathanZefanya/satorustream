import { Play, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import SignInPrompt from '../components/SignInPrompt'
import { useAuth } from '../contexts/authContext'
import { useSource } from '../contexts/sourceContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { clearHistoryEntry, getHistory, type HistoryEntry } from '../services/userLibrary'

const formatWatchedAt = (timestamp: number): string => {
  if (!timestamp) {
    return ''
  }

  return new Date(timestamp).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const HistoryPage = () => {
  const { user, loading: authLoading } = useAuth()
  const { sourceId, capabilities } = useSource()
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchHistory = useCallback(() => getHistory(user?.id), [user?.id])
  const { data, loading, error, reload, setData } = useAsyncData(fetchHistory, {
    enabled: !authLoading && Boolean(user),
  })

  const handleRemove = async (entry: HistoryEntry) => {
    const key = `${entry.sourceId}:${entry.episodeSlug}`
    setRemoving(key)

    try {
      await clearHistoryEntry(entry.episodeSlug, user?.id, entry.sourceId)
      setData((current) =>
        (current ?? []).filter(
          (item) => !(item.sourceId === entry.sourceId && item.episodeSlug === entry.episodeSlug),
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
          <h1 className="section-title">Riwayat Tontonan</h1>
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
          feature="Riwayat tontonan"
          description="Episode yang kamu tonton dicatat otomatis supaya mudah dilanjutkan dari perangkat lain."
        />
      )}

      {user && loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {user && !loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Gagal memuat riwayat.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {user && !loading && !error && entries.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Belum ada episode yang ditonton.
        </div>
      )}

      {user && !loading && !error && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => {
            const key = `${entry.sourceId}:${entry.episodeSlug}`
            const sameSource = entry.sourceId === sourceId
            const playable = sameSource && capabilities.streaming && Boolean(entry.episodeSlug)

            return (
              <article
                key={key}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <img
                  src={entry.poster || 'https://placehold.co/120x160?text=?'}
                  alt=""
                  loading="lazy"
                  className="h-20 w-14 shrink-0 rounded-lg object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {entry.title || entry.animeSlug || 'Anime'}
                  </p>
                  <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                    {entry.episodeLabel || entry.episodeSlug}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatWatchedAt(entry.watchedAt)}
                    {!sameSource && ` · sumber ${entry.sourceId}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {playable && (
                    <Link
                      to={`/watch/${entry.episodeSlug}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Lanjut
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleRemove(entry)}
                    disabled={removing === key}
                    aria-label="Hapus dari riwayat"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:text-rose-600 disabled:opacity-60 dark:border-slate-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HistoryPage
