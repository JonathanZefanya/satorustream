import { ChevronLeft, ChevronRight, Clapperboard, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAsyncData } from '../hooks/useAsyncData'
import { SITE_URL, useSeo } from '../hooks/useSeo'
import { useAuth } from '../contexts/authContext'
import { getEpisode, getStreamServer } from '../services/api'
import { recordHistory } from '../services/userLibrary'
import type { StreamServer } from '../types/anime'
import { lookupAnimeSlug, rememberEpisodeAnime } from '../utils/episodeMap'
import { getAnimeMeta } from '../utils/watchHistory'

type QualityOption = '360p' | '480p' | '720p'

type ProviderOption = {
  key: string
  provider: string
  url: string
}

/** Sumber yang sedang diputar: server streaming, atau tautan unduhan. */
type PlayerMode = 'server' | 'download'

const DEFAULT_SERVER_KEY = 'default'

const QUALITY_OPTIONS: QualityOption[] = ['360p', '480p', '720p']

const normalizeResolution = (resolution?: string): string => {
  return (resolution ?? '').toLowerCase().replace(/\s+/g, '')
}

const getQualityFromResolution = (resolution?: string): QualityOption | null => {
  const normalized = normalizeResolution(resolution)

  if (normalized.includes('360p')) {
    return '360p'
  }

  if (normalized.includes('480p')) {
    return '480p'
  }

  if (normalized.includes('720p')) {
    return '720p'
  }

  return null
}

const isIframeBlockedProvider = (url?: string | null): boolean => {
  if (!url) {
    return false
  }

  const target = url.toLowerCase()
  const blockedHints = ['odfiles', 'pixeldrain', 'pdrain', 'kfiles']
  return blockedHints.some((hint) => target.includes(hint))
}

const WatchPage = () => {
  const { endpoint = '' } = useParams()
  const { user } = useAuth()
  const [selectedQuality, setSelectedQuality] = useState<QualityOption>('360p')
  const [selectedProviderKey, setSelectedProviderKey] = useState<Partial<Record<QualityOption, string>>>({})
  const [playerMode, setPlayerMode] = useState<PlayerMode>('server')
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
    setPlayerMode('server')
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

  const providersByQuality = useMemo(() => {
    const providers: Record<QualityOption, ProviderOption[]> = {
      '360p': [],
      '480p': [],
      '720p': [],
    }

    const seen = new Set<string>()

    const mappedDownloads = [
      ...(data?.download_urls?.mp4 ?? []).map((item) => ({ ...item, format: 'mp4' as const })),
      ...(data?.download_urls?.mkv ?? []).map((item) => ({ ...item, format: 'mkv' as const })),
    ]

    mappedDownloads.forEach((entry) => {
      const quality = getQualityFromResolution(entry.resolution)

      if (!quality) {
        return
      }

      entry.urls.forEach((source, index) => {
        if (!source.url) {
          return
        }

        const providerLabel = `${source.provider ?? 'Provider'}${entry.format === 'mkv' ? ' (MKV)' : ''}`
        const key = `${quality}-${providerLabel}-${source.url}-${index}`

        if (seen.has(key)) {
          return
        }

        seen.add(key)
        providers[quality].push({
          key,
          provider: providerLabel,
          url: source.url,
        })
      })
    })

    return providers
  }, [data])

  const fallbackQuality = useMemo<QualityOption>(() => {
    return QUALITY_OPTIONS.find((quality) => providersByQuality[quality].length > 0) ?? '360p'
  }, [providersByQuality])

  const activeQuality: QualityOption = providersByQuality[selectedQuality].length > 0 ? selectedQuality : fallbackQuality

  const activeProviders = providersByQuality[activeQuality]

  const activeProvider = useMemo(() => {
    const pickedProviderKey = selectedProviderKey[activeQuality]
    return activeProviders.find((provider) => provider.key === pickedProviderKey) ?? activeProviders[0] ?? null
  }, [activeProviders, activeQuality, selectedProviderKey])

  const servers = data?.servers ?? []

  // Judul anime tidak ikut di respons episode, jadi diambil dari meta yang
  // sudah disimpan saat halaman detail dibuka.
  const animeMeta = getAnimeMeta(animeSlug)
  const episodeLabel = data?.episode?.trim() || 'Episode'
  const canonicalPath = `/watch/${endpoint}`

  useSeo({
    title: data ? `Nonton ${episodeLabel} Sub Indo` : 'Nonton Anime',
    description: data
      ? `Streaming ${episodeLabel}${animeMeta?.title ? ` dari ${animeMeta.title}` : ''} subtitle Indonesia gratis di SatoruStream. Tersedia kualitas 360p, 480p, dan 720p.`
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
    setPlayerMode('server')
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

  const activeServerUrl =
    selectedServerKey === DEFAULT_SERVER_KEY ? data?.iframe_url : serverUrls[selectedServerKey]

  const rawPlayerUrl = playerMode === 'server' ? activeServerUrl : activeProvider?.url
  const isBlockedProvider = playerMode === 'download' && isIframeBlockedProvider(rawPlayerUrl)
  const activePlayerUrl = isBlockedProvider ? null : rawPlayerUrl || null

  const activeSourceLabel =
    playerMode === 'server'
      ? selectedServerKey === DEFAULT_SERVER_KEY
        ? 'Default Stream'
        : (servers.find((server) => server.serverId === selectedServerKey)?.title ?? 'Server')
      : activeProvider?.provider

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
                playerMode === 'server' && selectedServerKey === DEFAULT_SERVER_KEY
                  ? 'border-rose-300 bg-rose-50 text-rose-600'
                  : data.iframe_url
                    ? 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600'
                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
              }`}
            >
              Default
            </button>

            {servers.map((server) => {
              const isSelected = playerMode === 'server' && selectedServerKey === server.serverId

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

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quality</p>
          {QUALITY_OPTIONS.map((quality) => {
            const available = providersByQuality[quality].length > 0
            const isActive = activeQuality === quality

            return (
              <button
                key={quality}
                type="button"
                disabled={!available}
                onClick={() => setSelectedQuality(quality)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  isActive
                    ? 'border-rose-300 bg-rose-50 text-rose-600'
                    : available
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600'
                      : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                }`}
              >
                {quality}
              </button>
            )
          })}
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Providers {activeQuality}
          </p>

          {activeProviders.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {activeProviders.map((provider) => {
                const isSelected = playerMode === 'download' && activeProvider?.key === provider.key

                return (
                  <button
                    key={provider.key}
                    type="button"
                    onClick={() => {
                      setPlayerMode('download')
                      setSelectedQuality(activeQuality)
                      setSelectedProviderKey((previous) => ({
                        ...previous,
                        [activeQuality]: provider.key,
                      }))
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600'
                    }`}
                  >
                    {provider.provider}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Provider untuk kualitas ini belum tersedia.</p>
          )}
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
                  {isBlockedProvider && activeProvider ? (
                    <>
                      <p className="mt-2 text-sm">
                        Provider ini memblokir pemutaran di dalam aplikasi (refused to connect).
                      </p>
                      <a
                        href={activeProvider.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
                      >
                        Buka di tab baru
                      </a>
                    </>
                  ) : (
                    <p className="mt-2 text-sm">No stream source available.</p>
                  )}
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
    </div>
  )
}

export default WatchPage
