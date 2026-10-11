import type {
  AnimeCollection,
  AnimeDetail,
  AnimeItem,
  EpisodeDetail,
  Genre,
  PagedItems,
  ScheduleDay,
  StreamServer,
} from '../../types/anime'
import { UnsupportedFeatureError, type SourceAdapter } from './types'
import {
  BASE_URL,
  encodeCompositeSlug,
  encodeSegment,
  getPayload,
  requirePayload,
  splitCompositeSlug,
} from './shared'

const PREFIX = '/kuramanime'
const LABEL = 'Kuramanime'

type AnimeCard = {
  title: string
  slug: string
  poster: string
  type: string
  quality: string
  highlight: string
  sourceUrl?: string
}

type PropertyCard = {
  title: string
  propertyId: string
  propertyType: string
  sourceUrl?: string
}

type AnimeDetailsPayload = {
  title: string
  alternativeTitle: string
  poster: string
  synopsis: { paragraphList: string[] }
  episodeRange: { first: number; last: number }
  info: Record<string, string>
  genreList: PropertyCard[]
  studioList: PropertyCard[]
}

type UrlLink = { title: string; url: string }

type EpisodeDetailsPayload = {
  title: string
  navigation?: { prev: { sourceUrl?: string } | null; next: { sourceUrl?: string } | null }
  streaming: UrlLink[]
  downloadLinks: { title: string; qualityList: { title: string; size: string; urlList?: UrlLink[] }[] }[]
}

/** Slug episode: `<id>/<slug anime>/<nomor episode>` dalam satu segmen. */
const episodeSlugFromUrl = (url?: string): string | undefined => {
  const match = String(url ?? '').match(/\/anime\/(\d+)\/([^/?#]+)\/episode\/([^/?#]+)/)
  return match ? encodeCompositeSlug(match[1], match[2], match[3]) : undefined
}

/**
 * Mirror kdrive (`*.my.id/kdrive/…`) membalas intro Kuramanime ~10 detik untuk
 * request <video> dari domain lain, jadi diputar lewat proxy backend.
 * URL R2 tetap langsung.
 */
const playableUrl = (url: string): string => {
  if (!/^https:\/\/[^/]+\/kdrive\//.test(url)) return url

  // Nama file ikut di path supaya URL proxy tetap dikenali sebagai .mp4.
  const file = new URL(url).pathname.split('/').pop() || 'video.mp4'
  return `${BASE_URL}${PREFIX}/stream/${encodeURIComponent(file)}?url=${encodeURIComponent(url)}`
}

const toDownloadUrls = (formats: EpisodeDetailsPayload['downloadLinks'] = []) => {
  const group = (name: string) =>
    formats
      .filter((format) => format.title.toLowerCase() === name)
      .flatMap((format) => format.qualityList)
      .map((quality) => ({
        resolution: quality.size ? `${quality.title} — ${quality.size}` : quality.title,
        urls: (quality.urlList ?? []).map((link) => ({ provider: link.title, url: link.url })),
      }))

  return { mp4: group('mp4'), mkv: group('mkv') }
}

/**
 * Kartu Kuramanime hanya memuat id numerik, sedangkan endpoint detail butuh
 * `<id>/<slug>`. Keduanya dipulihkan dari `sourceUrl` lalu disimpan sebagai
 * satu segmen URL yang sudah di-encode.
 */
const compositeSlugFromCard = (card: AnimeCard): string | undefined => {
  const match = String(card.sourceUrl ?? '').match(/\/anime\/(\d+)\/([^/?#]+)/)

  if (match) {
    return encodeCompositeSlug(match[1], match[2])
  }

  return card.slug ? encodeURIComponent(card.slug) : undefined
}

const fromCard = (card: AnimeCard): AnimeItem => ({
  title: card.title,
  slug: compositeSlugFromCard(card),
  poster: card.poster,
  current_episode: card.highlight,
  type: card.type,
  otakudesu_url: card.sourceUrl,
})

const episodeList = (animeId: string, animeSlug: string, range?: { first: number; last: number }) => {
  const first = Number(range?.first) || 0
  const last = Number(range?.last) || 0
  if (!first || last < first) return []

  return Array.from({ length: last - first + 1 }, (_, index) => {
    const episode = String(last - index)
    return { episode: `Episode ${episode}`, slug: encodeCompositeSlug(animeId, animeSlug, episode) }
  })
}

const propertyToGenre = (property: PropertyCard): Genre => ({
  name: property.title,
  slug: property.propertyId,
  otakudesu_url: property.sourceUrl,
})

export const kuramanimeAdapter: SourceAdapter = {
  id: 'kuramanime',
  label: LABEL,
  capabilities: {
    // Ongoing dan completed hanya tersedia sebagai ringkasan di beranda,
    // tanpa endpoint berhalaman tersendiri.
    ongoing: false,
    completed: false,
    search: true,
    genres: true,
    schedule: false,
    animeList: false,
    // Backend meniru alur token + POST `authorization` halaman episode;
    // hasilnya URL MP4 langsung per resolusi.
    streaming: true,
    downloadOnly: false,
  },

  async getHome() {
    const data = await getPayload<{
      ongoing: AnimeCard[]
      completed: AnimeCard[]
      movie: AnimeCard[]
    }>(`${PREFIX}/home`)

    return {
      ongoing: (data.ongoing ?? []).map(fromCard),
      complete: [...(data.completed ?? []), ...(data.movie ?? [])].map(fromCard),
    }
  },

  getOngoingPage(): Promise<PagedItems<AnimeItem>> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Daftar anime ongoing berhalaman'))
  },

  getCompletePage(): Promise<PagedItems<AnimeItem>> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Daftar anime selesai berhalaman'))
  },

  getSchedule(): Promise<ScheduleDay[]> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Jadwal rilis per hari'))
  },

  getAnimeCollections(): Promise<AnimeCollection[]> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Daftar anime A-Z'))
  },

  async getGenres(): Promise<Genre[]> {
    const data = await getPayload<PropertyCard[]>(`${PREFIX}/properties/genre`)
    return data.map(propertyToGenre)
  },

  async getAnimeByGenre(genreSlug: string, page = 1): Promise<PagedItems<AnimeItem>> {
    const genreId = encodeSegment(genreSlug, 'Genre slug')
    const { data, pagination } = await requirePayload<AnimeCard[]>(
      `${PREFIX}/properties/genre/${genreId}`,
      { params: { page } },
    )
    return { items: data.map(fromCard), pagination }
  },

  async searchAnime(query: string): Promise<AnimeItem[]> {
    const keyword = query.trim()
    if (!keyword) return []

    const data = await getPayload<AnimeCard[]>(`${PREFIX}/anime`, { params: { search: keyword } })
    return data.map(fromCard)
  },

  async getDetail(endpoint: string): Promise<AnimeDetail> {
    const parts = splitCompositeSlug(endpoint)

    if (parts.length < 2) {
      throw new Error('Anime endpoint harus berbentuk <id>/<slug>.')
    }

    const payload = await getPayload<AnimeDetailsPayload>(
      `${PREFIX}/anime/${parts[0]}/${parts[1]}`,
    )

    const info = payload.info ?? {}

    return {
      title: payload.title,
      japanese_title: payload.alternativeTitle,
      poster: payload.poster,
      rating: info.score,
      type: info.type,
      status: info.status,
      episode_count: info.totalEpisodes,
      duration: info.duration,
      release_date: info.aired || info.season,
      studio: info.studio,
      produser: info.producer,
      genres: (payload.genreList ?? []).map(propertyToGenre),
      synopsis: (payload.synopsis?.paragraphList ?? []).join('\n\n'),
      batch: null,
      episode_lists: episodeList(parts[0], parts[1], payload.episodeRange),
      recommendations: [],
    }
  },

  async getEpisode(endpoint: string): Promise<EpisodeDetail> {
    const [animeId, animeSlug, episode] = splitCompositeSlug(endpoint)

    if (!animeId || !animeSlug || !episode) {
      throw new Error('Episode endpoint harus berbentuk <id>/<slug>/<episode>.')
    }

    const payload = await getPayload<EpisodeDetailsPayload>(
      `${PREFIX}/episode/${animeId}/${animeSlug}/${episode}`,
    )

    const prev = episodeSlugFromUrl(payload.navigation?.prev?.sourceUrl)
    const next = episodeSlugFromUrl(payload.navigation?.next?.sourceUrl)
    // Diurutkan dari resolusi terkecil; default tetap memakai yang tertinggi.
    const servers: StreamServer[] = [...(payload.streaming ?? [])]
      .sort((a, b) => (Number.parseInt(a.title, 10) || 0) - (Number.parseInt(b.title, 10) || 0))
      .map((stream) => ({ title: `Kuramadrive ${stream.title}`, serverId: playableUrl(stream.url) }))

    return {
      episode: payload.title,
      anime: { slug: encodeCompositeSlug(animeId, animeSlug) },
      has_previous_episode: Boolean(prev),
      previous_episode: prev ? { slug: prev } : null,
      has_next_episode: Boolean(next),
      next_episode: next ? { slug: next } : null,
      iframe_url: servers.at(-1)?.serverId ?? '',
      servers,
      download_urls: toDownloadUrls(payload.downloadLinks),
    }
  },

  /** serverId sudah berupa URL MP4 — tidak perlu diselesaikan lagi. */
  getStreamServer(server: StreamServer): Promise<string> {
    return Promise.resolve(server.serverId)
  },
}
