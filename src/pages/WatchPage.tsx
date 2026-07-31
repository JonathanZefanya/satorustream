import { ChevronLeft, ChevronRight, Clapperboard, ListVideo, Loader2, Play } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAsyncData } from '../hooks/useAsyncData'
import { SITE_URL, useSeo } from '../hooks/useSeo'
import { useAuth } from '../contexts/authContext'
import { getDetail, getEpisode, getStreamServer } from '../services/api'
import { recordHistory } from '../services/userLibrary'
import type { StreamServer } from '../types/anime'
import { episodeNumberFrom, stripAnimeTitle } from '../utils/episodeLabel'
import { lookupAnimeSlug, rememberEpisodeAnime } from '../utils/episodeMap'
import { getAnimeMeta } from '../utils/watchHistory'

const DEFAULT_SERVER_KEY = 'default'

const WatchPage = () => {
  const { endpoint = '' } = useParams()
  const { user } = useAuth()
  const [selectedServerKey, setSelectedServerKey] = useState<string>(DEFAULT_SERVER_KEY)
  const [serverUrls, setServerUrls] = useState<Record<string, string>>({})
  const [serverLoading, setServerLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const fetchEpisode = useCallback(() => getEpisode(endpoint), [endpoint])
  const { data, loading, error, reload } = useAsyncData(fetchEpisode, {
    enabled: Boolean(endpoint),
  })

  // Reset pilihan server setiap ganti episode. Disesuaikan saat render (bukan
  // di effect) supaya tidak memicu render berantai.
  const [renderedEndpoint, setRenderedEndpoint] = useState(endpoint)
  if (renderedEndpoint !== endpoint) {
    setRenderedEndpoint(endpoint)
    setSelectedServerKey(DEFAULT_SERVER_KEY)
    setServerUrls({})
    setServerError(null)
  }

  const animeSlug = data?.anime?.slug ?? lookupAnimeSlug(endpoint)

  useEffect(() => {
    if (!data) {
      return
    }

    // Episode tetangga berasal dari anime yang sama — catat supaya navigasi
    // prev/next tidak kehilangan induknya.
    rememberEpisodeAnime(animeSlug, [
      endpoint,
      data.previous_episode?.slug,
      data.next_episode?.slug,
    ])

    const meta = getAnimeMeta(animeSlug)
    void recordHistory(
      {
        animeSlug,
        episodeSlug: endpoint,
        episodeLabel: data.episode,
        title: meta?.title,
        poster: meta?.poster,
      },
      user?.id,
    )
  }, [animeSlug, data, endpoint, user?.id])

  // Daftar episode diambil dari halaman detail animenya. Slug induk baru
  // diketahui setelah data episode tiba (atau dari pemetaan lokal), jadi
  // permintaannya menyusul dan tidak menahan pemutaran.
  const fetchEpisodeList = useCallback(
    () => (animeSlug ? getDetail(animeSlug) : Promise.resolve(null)),
    [animeSlug],
  )
  const {
    data: animeDetail,
    loading: episodeListLoading,
    error: episodeListError,
  } = useAsyncData(fetchEpisodeList, { enabled: Boolean(animeSlug) })

  const episodeList = useMemo(() => animeDetail?.episode_lists ?? [], [animeDetail])
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

  const servers = data?.servers ?? []

  // Judul anime tidak ikut di respons episode, jadi diambil dari meta yang
  // sudah disimpan saat halaman detail dibuka.
  const animeMeta = getAnimeMeta(animeSlug)
  const episodeLabel = data?.episode?.trim() || 'Episode'
  const canonicalPath = `/watch/${endpoint}`

  useSeo({
    title: data ? `Nonton ${episodeLabel} Sub Indo` : 'Nonton Anime',
    description: data
      ? `Streaming ${episodeLabel}${animeMeta?.title ? ` dari ${animeMeta.title}` : ''} subtitle Indonesia gratis di SatoruStream. Tersedia beberapa server pemutar.`
      : 'Streaming episode anime subtitle Indonesia di SatoruStream.',
    image: animeMeta?.poster,
    canonicalPath,
    type: 'video.episode',
    jsonLd: data
      ? {
          '@context': 'https://schema.org',
          '@type': 'TVEpisode',
          name: episodeLabel,
          url: `${SITE_URL}${canonicalPath}`,
          image: animeMeta?.poster || undefined,
          inLanguage: 'ja',
          subtitleLanguage: 'id',
          partOfSeries: animeMeta?.title
            ? {
                '@type': 'TVSeries',
                name: animeMeta.title,
                url: animeSlug ? `${SITE_URL}/anime/${animeSlug}` : undefined,
              }
            : undefined,
        }
      : undefined,
  })

  const handlePickServer = async (server: StreamServer | null) => {
    setServerError(null)

    if (!server) {
      setSelectedServerKey(DEFAULT_SERVER_KEY)
      return
    }

    setSelectedServerKey(server.serverId)

    if (serverUrls[server.serverId]) {
      return
    }

    setServerLoading(true)

    try {
      const url = await getStreamServer(server)
      setServerUrls((previous) => ({ ...previous, [server.serverId]: url }))
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Gagal memuat server ini.')
    } finally {
      setServerLoading(false)
    }
  }

  const activePlayerUrl =
    (selectedServerKey === DEFAULT_SERVER_KEY
      ? data?.iframe_url
      : serverUrls[selectedServerKey]) || null

  const activeSourceLabel =
    selectedServerKey === DEFAULT_SERVER_KEY
      ? 'Default Stream'
      : (servers.find((server) => server.serverId === selectedServerKey)?.title ?? 'Server')

  if (loading) {
    return (
      <div className="container-app py-6 sm:py-8">
        <div className="animate-pulse space-y-4">
          <div className="aspect-video w-full rounded-2xl bg-slate-200" />
          <div className="h-6 w-2/3 rounded bg-slate-200" />
          <div className="h-10 w-48 rounded bg-slate-200" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-app py-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <p className="font-semibold">Unable to load episode stream.</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-4 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container-app py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Episode data is unavailable.
        </div>
      </div>
    )
  }

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="surface-panel overflow-hidden p-3 sm:p-4">
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Server streaming</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handlePickServer(null)}
              disabled={!data.iframe_url}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                selectedServerKey === DEFAULT_SERVER_KEY
                  ? 'border-rose-300 bg-rose-50 text-rose-600'
                  : data.iframe_url
                    ? 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600'
                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
              }`}
            >
              Default
            </button>

            {servers.map((server) => {
              const isSelected = selectedServerKey === server.serverId

              return (
                <button
                  key={server.serverId}
                  type="button"
                  onClick={() => void handlePickServer(server)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600'
                  }`}
                >
                  {isSelected && serverLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {server.title}
                </button>
              )
            })}
          </div>

          {serverError ? <p className="mt-2 text-xs text-rose-600">{serverError}</p> : null}
          {servers.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Server alternatif tidak tersedia untuk episode ini.
            </p>
          ) : null}
        </div>

        {activePlayerUrl ? (
          <iframe
            src={activePlayerUrl}
            title={data.episode}
            referrerPolicy="no-referrer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="w-full aspect-video rounded-xl bg-slate-950"
          />
        ) : (
          <div className="flex w-full aspect-video items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <div className="text-center">
              {serverLoading ? (
                <>
                  <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                  <p className="mt-2 text-sm">Memuat server...</p>
                </>
              ) : (
                <>
                  <Clapperboard className="mx-auto h-8 w-8" />
                  <p className="mt-2 text-sm">
                    Server ini tidak mengirimkan tautan pemutar. Coba pilih server lain di atas.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <h1 className="mt-4 text-lg font-bold text-slate-900 sm:text-xl">{data.episode}</h1>

        {activeSourceLabel ? (
          <p className="mt-2 text-xs text-slate-500">
            Sumber aktif: <span className="font-semibold text-slate-700">{activeSourceLabel}</span>
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {data.has_previous_episode && data.previous_episode?.slug ? (
            <Link
              to={`/watch/${data.previous_episode.slug}`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev Episode
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400">
              <ChevronLeft className="h-4 w-4" />
              Prev Episode
            </span>
          )}

          {animeSlug ? (
            <Link
              to={`/anime/${animeSlug}`}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
            >
              Back to Anime
            </Link>
          ) : null}

          {data.has_next_episode && data.next_episode?.slug ? (
            <Link
              to={`/watch/${data.next_episode.slug}`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
            >
              Next Episode
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400">
              Next Episode
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      {/* Daftar episode di bawah kotak pemutar: pindah episode tanpa harus
          kembali ke halaman detail, dan episode yang sedang diputar ditandai. */}
      <section className="surface-panel mt-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
              <ListVideo className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daftar Episode</h2>
              <p className="text-xs text-slate-500">
                {animeMeta?.title || animeDetail?.title || 'Anime ini'}
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
          ) : episodeListLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="h-11 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : episodeListError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Daftar episode gagal dimuat: {episodeListError}
            </p>
          ) : episodeList.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Sumber ini tidak mengirimkan daftar episode.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {episodeList.map((episode, index) => {
                const isActive = Boolean(episode.slug) && episode.slug === endpoint
                const label =
                  stripAnimeTitle(episode.episode, animeDetail?.title || animeMeta?.title) ||
                  episode.episode ||
                  'Episode'
                const number = episodeNumberFrom(episode.episode) ?? String(episodeList.length - index)

                if (!episode.slug) {
                  return null
                }

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
                          isActive
                            ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
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
    </div>
  )
}

export default WatchPage
