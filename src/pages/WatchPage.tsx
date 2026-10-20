import { useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAsyncData } from '../hooks/useAsyncData'
import { SITE_URL, useSeo } from '../hooks/useSeo'
import { useAuth } from '../contexts/authContext'
import { getDetail, getEpisode } from '../services/api'
import { useSource } from '../contexts/sourceContext'
import DownloadList from '../components/DownloadList'
import EpisodeListPanel from '../components/watch/EpisodeListPanel'
import EpisodeNavigation from '../components/watch/EpisodeNavigation'
import ServerPicker from '../components/watch/ServerPicker'
import StreamPlayer from '../components/watch/StreamPlayer'
import { useStreamServers } from '../components/watch/useStreamServers'
import { recordHistory } from '../services/userLibrary'
import { lookupAnimeSlug, rememberEpisodeAnime } from '../utils/episodeMap'
import { getAnimeMeta, saveAnimeMeta } from '../utils/watchHistory'
import ErrorState from '../components/ErrorState'

const WatchPage = () => {
  const { endpoint = '' } = useParams()
  const { user } = useAuth()
  const { capabilities } = useSource()
  const downloadOnly = capabilities.downloadOnly

  const fetchEpisode = useCallback(() => getEpisode(endpoint), [endpoint])
  const { data, loading, error, failure, reload } = useAsyncData(fetchEpisode, {
    enabled: Boolean(endpoint),
  })

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
    failure: episodeListError,
    reload: reloadEpisodeList,
  } = useAsyncData(fetchEpisodeList, { enabled: Boolean(animeSlug) })

  const servers = data?.servers ?? []
  const { selectedServerKey, serverLoading, serverError, pickServer, activePlayerUrl, activeSourceLabel } =
    useStreamServers(endpoint, data?.iframe_url, servers)

  // Judul anime tidak ikut di respons episode, jadi diambil dari meta yang
  // sudah disimpan saat halaman detail dibuka.
  const animeMeta = getAnimeMeta(animeSlug)
  useEffect(() => {
    if (!animeDetail || !animeSlug) return

    saveAnimeMeta({
      slug: animeSlug,
      title: animeDetail.title,
      poster: animeDetail.poster,
      genres: animeDetail.genres,
      episode_count: animeDetail.episode_count || String(animeDetail.episode_lists?.length || ''),
    })
  }, [animeDetail, animeSlug])
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
        <ErrorState error={failure} title="Gagal memuat episode" onRetry={reload} />
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="surface-panel overflow-hidden p-2 sm:p-4">
          {downloadOnly ? (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Unduhan
              </p>
              <p className="mt-1 mb-3 text-xs text-slate-500 dark:text-slate-400">
                Sumber ini tidak menyediakan pemutar — episodenya hanya tersedia sebagai berkas
                unduhan.
              </p>
              <DownloadList downloads={data.download_urls} />
            </div>
          ) : (
            <>
              <ServerPicker
                servers={servers}
                hasDefault={Boolean(data.iframe_url)}
                selectedServerKey={selectedServerKey}
                loading={serverLoading}
                error={serverError}
                onPick={(server) => void pickServer(server)}
              />
              <StreamPlayer url={activePlayerUrl} title={data.episode} loading={serverLoading} />
            </>
          )}

          <h1 className="mt-4 text-lg font-bold text-slate-900 sm:text-xl">{data.episode}</h1>

          {activeSourceLabel && !downloadOnly ? (
            <p className="mt-2 text-xs text-slate-500">
              Sumber aktif: <span className="font-semibold text-slate-700">{activeSourceLabel}</span>
            </p>
          ) : null}

          <EpisodeNavigation
            previousSlug={data.has_previous_episode ? data.previous_episode?.slug : undefined}
            nextSlug={data.has_next_episode ? data.next_episode?.slug : undefined}
            animeSlug={animeSlug}
          />
        </div>

        <EpisodeListPanel
          endpoint={endpoint}
          animeSlug={animeSlug}
          animeTitle={animeDetail?.title || animeMeta?.title}
          episodes={animeDetail?.episode_lists ?? []}
          loading={episodeListLoading}
          error={episodeListError}
          onRetry={reloadEpisodeList}
        />
      </div>
    </div>
  )
}

export default WatchPage
