import { ChevronRight, ListVideo, Play } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Episode } from '../../types/anime'
// gunakan ini jika ingin menampilkan nomor episode di daftar episode
import { episodeNumberFrom, episodeNumberValue, stripAnimeTitle } from '../../utils/episodeLabel'
import ErrorState from '../ErrorState'
// gunakan ini jika ingin menampilkan nomor episode di daftar episode
// import {  episodeNumberValue, stripAnimeTitle } from '../../utils/episodeLabel'

type EpisodeListPanelProps = {
  /** Episode yang sedang diputar. */
  endpoint: string
  animeSlug?: string
  animeTitle?: string
  episodes: Episode[]
  loading: boolean
  error: unknown
  onRetry?: () => void | Promise<void>
}

/** Urutkan dari episode terbaru; episode tanpa nomor ditaruh di akhir. */
const sortEpisodes = (episodes: Episode[], animeTitle?: string): Episode[] =>
  [...episodes].sort((left, right) => {
    const leftNumber = episodeNumberValue(stripAnimeTitle(left.episode, animeTitle))
    const rightNumber = episodeNumberValue(stripAnimeTitle(right.episode, animeTitle))

    if (leftNumber === null && rightNumber === null) return 0
    if (leftNumber === null) return 1
    if (rightNumber === null) return -1
    return rightNumber - leftNumber
  })

/**
 * Daftar episode di samping pemutar: pindah episode tanpa harus kembali ke
 * halaman detail, dan episode yang sedang diputar ditandai.
 */
const EpisodeListPanel = ({ endpoint, animeSlug, animeTitle, episodes, loading, error, onRetry }: EpisodeListPanelProps) => {
  const episodeList = useMemo(() => sortEpisodes(episodes, animeTitle), [episodes, animeTitle])
  const episodeListRef = useRef<HTMLDivElement>(null)

  // Daftarnya panjang dan episode yang diputar bisa ada di tengah; posisinya
  // digeser di dalam kotak daftar saja, tanpa menggulir halaman.
  useEffect(() => {
    const container = episodeListRef.current
    const active = container?.querySelector<HTMLElement>('[data-active="true"]')

    if (!container || !active) {
      return
    }

    container.scrollTop = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2
  }, [endpoint, episodeList])

  return (
    <section className="surface-panel p-4 sm:p-5 lg:sticky lg:top-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
            <ListVideo className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Daftar Episode</h2>
            <p className="text-xs text-slate-500">
              {animeTitle || 'Anime ini'}
              {episodeList.length > 0 ? ` · ${episodeList.length} episode` : ''}
            </p>
          </div>
        </div>

        {animeSlug ? (
          <Link
            to={`/anime/${animeSlug}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
          >
            Detail anime
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      <div ref={episodeListRef} className="relative mt-3 max-h-[22rem] overflow-y-auto pr-1">
        {!animeSlug ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Induk anime untuk episode ini belum diketahui. Buka lewat halaman detail anime supaya
            daftar episodenya bisa ditampilkan.
          </p>
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-11 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} title="Daftar episode gagal dimuat" onRetry={onRetry} compact />
        ) : episodeList.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Sumber ini tidak mengirimkan daftar episode.
          </p>
        ) : (
          <ol className="space-y-1.5">
            {/* Gunakan ini jika ingin menampilkan daftar episode dengan number */}
            {episodeList.map((episode, index) => {
              const isActive = Boolean(episode.slug) && episode.slug === endpoint
              const label = stripAnimeTitle(episode.episode, animeTitle) || episode.episode || 'Episode'
              const number =
                episodeNumberFrom(stripAnimeTitle(episode.episode, animeTitle)) ??
                String(episodeList.length - index)

              if (!episode.slug) {
                return null
              }

              // Gunakan ini jika ingin menampilkan daftar episode dengan simbol
              // {episodeList.map((episode) => {
              // const isActive = Boolean(episode.slug) && episode.slug === endpoint
              // const label =
              //   stripAnimeTitle(episode.episode, animeTitle) ||
              //   episode.episode ||
              //   'Episode'

              // if (!episode.slug) {
              //   return null
              // }

              return (
                <li key={episode.slug}>
                  <Link
                    to={`/watch/${episode.slug}`}
                    data-active={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/60 dark:bg-rose-950/40 dark:text-rose-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600'
                    }`}
                  >
                    <span
                      className={`inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isActive ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {/* {isActive ? <Play className="h-3.5 w-3.5" /> : "Ş"} */}
                      {/* Gunakan ini jika ingin menampilkan nomor episode di daftar episode */}
                      {isActive ? <Play className="h-3.5 w-3.5" /> : number}
                    </span>

                    <span className="line-clamp-1 flex-1">{label}</span>

                    {isActive ? (
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:bg-rose-900/60 dark:text-rose-200">
                        Sedang ditonton
                      </span>
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}

export default EpisodeListPanel
