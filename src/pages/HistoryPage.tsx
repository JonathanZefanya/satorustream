import { CheckSquare, Layers, Play, Trash2, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import SignInPrompt from '../components/SignInPrompt'
import { useAuth } from '../contexts/authContext'
import { useSource } from '../contexts/sourceContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { useSeo } from '../hooks/useSeo'
import { clearHistoryEntries, getHistory, type HistoryEntry } from '../services/userLibrary'
import { stripAnimeTitle } from '../utils/episodeLabel'
import { watchPath } from '../utils/routes'

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

const toolbarButtonClass =
  'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'

const formatEpisodeLabel = (entry: HistoryEntry): string =>
  stripAnimeTitle(entry.episodeLabel, entry.title) || entry.episodeSlug

interface HistoryGroup {
  key: string
  /** Episode terakhir yang ditonton — satu-satunya yang ditampilkan. */
  latest: HistoryEntry
  episodeSlugs: string[]
}

/**
 * Satu anime diwakili satu baris. Riwayat mentah menyimpan tiap episode secara
 * terpisah (dipakai untuk menandai episode mana saja yang sudah ditonton), tapi
 * di halaman ini hanya episode terakhir yang perlu terlihat.
 */
const groupByAnime = (entries: HistoryEntry[]): HistoryGroup[] => {
  const groups = new Map<string, HistoryGroup>()

  ;[...entries]
    .sort((a, b) => b.watchedAt - a.watchedAt)
    .forEach((entry) => {
      // Sebagian sumber tidak mengirim slug induk; judul dipakai sebagai
      // cadangan supaya episode dari anime yang sama tetap menyatu.
      const identity =
        entry.animeSlug || entry.title?.trim().toLowerCase() || entry.episodeSlug
      const key = `${entry.sourceId}::${identity}`
      const existing = groups.get(key)

      if (!existing) {
        groups.set(key, { key, latest: entry, episodeSlugs: [entry.episodeSlug] })
        return
      }

      existing.episodeSlugs.push(entry.episodeSlug)
    })

  return [...groups.values()]
}

const HistoryPage = () => {
  const { user, loading: authLoading } = useAuth()
  const { sourceId, capabilities } = useSource()

  useSeo({
    title: 'Riwayat Tontonan',
    description: 'Episode yang terakhir kamu tonton, siap dilanjutkan kapan saja.',
    canonicalPath: '/history',
    noIndex: true,
  })

  const [pendingRemoval, setPendingRemoval] = useState<HistoryGroup[] | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [removing, setRemoving] = useState(false)
  const [removalError, setRemovalError] = useState<string | null>(null)

  const fetchHistory = useCallback(() => getHistory(user?.id), [user?.id])
  const { data, loading, error, reload, setData } = useAsyncData(fetchHistory, {
    enabled: !authLoading && Boolean(user),
  })

  const entries = useMemo(() => data ?? [], [data])
  const groups = useMemo(() => groupByAnime(entries), [entries])
  const selectedGroups = useMemo(() => groups.filter((group) => selected.has(group.key)), [groups, selected])
  const allSelected = groups.length > 0 && selectedGroups.length === groups.length

  const toggleSelected = (key: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const exitSelecting = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  const handleConfirmRemove = async () => {
    if (!pendingRemoval) {
      return
    }

    setRemoving(true)
    setRemovalError(null)

    const bySource = new Map<string, string[]>()
    pendingRemoval.forEach(({ latest, episodeSlugs }) => {
      bySource.set(latest.sourceId, [...(bySource.get(latest.sourceId) ?? []), ...episodeSlugs])
    })

    try {
      await Promise.all(
        [...bySource].map(([source, slugs]) => clearHistoryEntries(slugs, user?.id, source)),
      )

      const removed = new Set(
        [...bySource].flatMap(([source, slugs]) => slugs.map((slug) => `${source}::${slug}`)),
      )
      setData((current) =>
        (current ?? []).filter((item) => !removed.has(`${item.sourceId}::${item.episodeSlug}`)),
      )
      setPendingRemoval(null)
      exitSelecting()
    } catch (err) {
      setRemovalError(err instanceof Error ? err.message : 'Gagal menghapus riwayat.')
    } finally {
      setRemoving(false)
    }
  }

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
          <div className="flex flex-wrap items-center gap-2">
            {selecting ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelected(allSelected ? new Set() : new Set(groups.map((group) => group.key)))}
                  className={toolbarButtonClass}
                >
                  {allSelected ? 'Batal pilih semua' : 'Pilih semua'}
                </button>
                <button
                  type="button"
                  disabled={selectedGroups.length === 0}
                  onClick={() => {
                    setRemovalError(null)
                    setPendingRemoval(selectedGroups)
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus ({selectedGroups.length})
                </button>
                <button type="button" onClick={exitSelecting} aria-label="Batal memilih" className={toolbarButtonClass}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                {groups.length > 0 && (
                  <button type="button" onClick={() => setSelecting(true)} className={toolbarButtonClass}>
                    <CheckSquare className="h-3.5 w-3.5" />
                    Pilih
                  </button>
                )}
                <button type="button" onClick={() => void reload()} className={toolbarButtonClass}>
                  Refresh
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {!authLoading && !user && (
        <SignInPrompt
          feature="Riwayat tontonan"
          description="Episode yang kamu tonton dicatat otomatis supaya mudah dilanjutkan dari perangkat lain."
        />
      )}

      {user && loading && (
        <div className="space-y-3">
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

      {user && !loading && !error && groups.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Belum ada episode yang ditonton.
        </div>
      )}

      {user && !loading && !error && groups.length > 0 && (
        <div className="space-y-2">
          {groups.map((group) => {
            const entry = group.latest
            const sameSource = entry.sourceId === sourceId
            const playable = sameSource && capabilities.streaming && Boolean(entry.episodeSlug)
            const watchedCount = group.episodeSlugs.length
            const isSelected = selected.has(group.key)

            return (
              <article
                key={group.key}
                onClick={selecting ? () => toggleSelected(group.key) : undefined}
                className={`flex items-center gap-3 rounded-lg border bg-white p-3 transition dark:bg-slate-900 ${
                  selecting ? 'cursor-pointer select-none' : ''
                } ${
                  isSelected
                    ? 'border-rose-300 dark:border-rose-700'
                    : 'border-slate-200 hover:border-rose-200 dark:border-slate-700 dark:hover:border-rose-800'
                }`}
              >
                {selecting && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(group.key)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Pilih ${entry.title || 'anime ini'}`}
                    className="h-4 w-4 shrink-0 accent-rose-600"
                  />
                )}
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
                    Terakhir: {formatEpisodeLabel(entry)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                    <span>{formatWatchedAt(entry.watchedAt)}</span>
                    {watchedCount > 1 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        <Layers className="h-3 w-3" />
                        {watchedCount} episode
                      </span>
                    )}
                    {!sameSource && <span>· sumber {entry.sourceId}</span>}
                  </div>
                </div>

                {!selecting && (
                <div className="flex shrink-0 items-center gap-2">
                  {playable && (
                    <Link
                      to={watchPath(entry.episodeSlug)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Lanjut
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setRemovalError(null)
                      setPendingRemoval([group])
                    }}
                    aria-label={`Hapus riwayat ${entry.title || 'anime ini'}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:hover:border-rose-800 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title="Hapus dari riwayat?"
        description={
          pendingRemoval ? (
            <>
              {pendingRemoval.length === 1 ? (
                <>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {pendingRemoval[0].latest.title || 'Anime ini'}
                  </span>{' '}
                  akan dihapus dari riwayat
                  {pendingRemoval[0].episodeSlugs.length > 1
                    ? ` beserta ${pendingRemoval[0].episodeSlugs.length} episode yang tercatat`
                    : ''}
                </>
              ) : (
                <>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {pendingRemoval.length} anime
                  </span>{' '}
                  akan dihapus dari riwayat beserta semua episode yang tercatat
                </>
              )}
              . Tindakan ini tidak bisa dibatalkan.
              {removalError ? (
                <span className="mt-2 block text-rose-600 dark:text-rose-400">{removalError}</span>
              ) : null}
            </>
          ) : null
        }
        confirmLabel={removing ? 'Menghapus...' : 'Hapus'}
        busy={removing}
        onConfirm={() => void handleConfirmRemove()}
        onCancel={() => {
          if (removing) {
            return
          }

          setPendingRemoval(null)
          setRemovalError(null)
        }}
      />
    </div>
  )
}

export default HistoryPage
