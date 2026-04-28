import { ChevronLeft, ChevronRight, Clapperboard } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAsyncData } from '../hooks/useAsyncData'
import { getEpisode } from '../services/api'
import { getAnimeMeta, recordWatchHistory } from '../utils/watchHistory'

type QualityOption = '360p' | '480p' | '720p'

type ProviderOption = {
  key: string
  provider: string
  url: string
}

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

const isIframeBlockedProvider = (provider?: ProviderOption | null): boolean => {
  if (!provider) {
    return false
  }

  const target = `${provider.provider} ${provider.url}`.toLowerCase()
  const blockedHints = ['odfiles', 'pixeldrain', 'pdrain', 'kfiles']
  return blockedHints.some((hint) => target.includes(hint))
}

const WatchPage = () => {
  const { endpoint = '' } = useParams()
  const [selectedQuality, setSelectedQuality] = useState<QualityOption>('360p')
  const [selectedProviderKey, setSelectedProviderKey] = useState<Partial<Record<QualityOption, string>>>({})

  const fetchEpisode = useCallback(() => getEpisode(endpoint), [endpoint])
  const { data, loading, error, reload } = useAsyncData(fetchEpisode, {
    enabled: Boolean(endpoint),
  })

  useEffect(() => {
    if (!data) {
      return
    }

    const meta = getAnimeMeta(data.anime?.slug)
    recordWatchHistory({
      animeSlug: data.anime?.slug,
      episodeSlug: endpoint,
      episodeLabel: data.episode,
      title: meta?.title,
      poster: meta?.poster,
    })
  }, [data, endpoint])

  const providersByQuality = useMemo(() => {
    const providers: Record<QualityOption, ProviderOption[]> = {
      '360p': [],
      '480p': [],
      '720p': [],
    }

    const seen = new Set<string>()

    if (data?.iframe_url) {
      const key = `360p-default-${data.iframe_url}`
      seen.add(key)
      providers['360p'].push({
        key,
        provider: 'Default Stream',
        url: data.iframe_url,
      })
    }

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

  const isBlockedProvider = useMemo(() => isIframeBlockedProvider(activeProvider), [activeProvider])
  const activePlayerUrl = !isBlockedProvider ? activeProvider?.url ?? null : null

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
                const isSelected = activeProvider?.key === provider.key

                return (
                  <button
                    key={provider.key}
                    type="button"
                    onClick={() => {
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
            </div>
          </div>
        )}

        <h1 className="mt-4 text-lg font-bold text-slate-900 sm:text-xl">{data.episode}</h1>

        {activeProvider ? (
          <p className="mt-2 text-xs text-slate-500">
            Provider aktif: <span className="font-semibold text-slate-700">{activeProvider.provider}</span>
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

          {data.anime.slug ? (
            <Link
              to={`/anime/${data.anime.slug}`}
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