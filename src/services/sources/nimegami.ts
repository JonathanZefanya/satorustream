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
  encodeCompositeSlug,
  encodeSegment,
  genreFromLink,
  getPayload,
  idFromUrl,
  requirePayload,
  splitCompositeSlug,
  toDownloadUrls,
  type Format,
  type UrlLink,
} from './shared'

const PREFIX = '/nimegami'
const LABEL = 'Nimegami'

type AnimeCard = {
  title: string
  slug: string
  poster: string
  rating: string
  episode: string
  studio: string
  categories: UrlLink[]
  status: string
  type: string
  sourceUrl?: string
  date: string
}

type EpisodeItem = { episode: number; title: string; url: string }

type AnimeDetailsPayload = {
  title: string
  alternativeTitle: string
  poster: string
  rating: string
  studio: string
  season: string
  type: string
  series: string
  categories: UrlLink[]
  credit: string
  synopsis: string
  duration: string
  downloadLinks: Format[]
  episodeList: EpisodeItem[]
}

type StreamSource = { format: string; url: string }

type EpisodeDetailsPayload = {
  title: string
  episode: number
  poster: string
  animeSlug: string
  streamSources: StreamSource[]
  downloadLinks: Format[]
  navigation: { prev: number | null; next: number | null }
}

const fromCard = (card: AnimeCard): AnimeItem => ({
  title: card.title,
  slug: card.slug,
  poster: card.poster,
  current_episode: card.episode ? `Episode ${card.episode}` : undefined,
  rating: card.rating,
  status: card.status,
  type: card.type,
  studio: card.studio,
  genres: (card.categories ?? []).map(genreFromLink),
  newest_release_date: card.date,
  otakudesu_url: card.sourceUrl,
})

/** Episode Nimegami dialamatkan sebagai `<slug anime>/<nomor episode>`. */
const episodeSlug = (animeSlug: string, episode: number) =>
  encodeCompositeSlug(animeSlug, String(episode))

export const nimegamiAdapter: SourceAdapter = {
  id: 'nimegami',
  label: LABEL,
  capabilities: {
    ongoing: true,
    // Tidak ada endpoint daftar completed.
    completed: false,
    search: true,
    genres: true,
    // Jadwalnya datar, tanpa pengelompokan hari.
    schedule: false,
    animeList: false,
    streaming: true,
  },

  async getHome() {
    const ongoing = await this.getOngoingPage(1)
    return { ongoing: ongoing.items, complete: [] }
  },

  async getOngoingPage(page = 1): Promise<PagedItems<AnimeItem>> {
    const { data, pagination } = await requirePayload<AnimeCard[]>(`${PREFIX}/ongoing`, {
      params: { page },
    })
    return { items: data.map(fromCard), pagination }
  },

  getCompletePage(): Promise<PagedItems<AnimeItem>> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Daftar anime selesai'))
  },

  getSchedule(): Promise<ScheduleDay[]> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Jadwal rilis per hari'))
  },

  getAnimeCollections(): Promise<AnimeCollection[]> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Daftar anime A-Z'))
  },

  async getGenres(): Promise<Genre[]> {
    const data = await getPayload<UrlLink[]>(`${PREFIX}/genre`)
    return data.map((genre) => ({
      // Nimegami menulis jumlah judul di nama genre ("Action (1526)").
      name: genre.title.replace(/\s*\(\d+\)\s*$/, '').trim(),
      slug: idFromUrl(genre.url),
      otakudesu_url: genre.url,
    }))
  },

  async getAnimeByGenre(genreSlug: string, page = 1): Promise<PagedItems<AnimeItem>> {
    const genreId = encodeSegment(genreSlug, 'Genre slug')
    const { data, pagination } = await requirePayload<AnimeCard[]>(`${PREFIX}/genre/${genreId}`, {
      params: { page },
    })
    return { items: data.map(fromCard), pagination }
  },

  async searchAnime(query: string): Promise<AnimeItem[]> {
    const keyword = query.trim()
    if (!keyword) return []

    const data = await getPayload<AnimeCard[]>(`${PREFIX}/search`, { params: { q: keyword } })
    return data.map(fromCard)
  },

  async getDetail(endpoint: string): Promise<AnimeDetail> {
    const slug = encodeSegment(endpoint, 'Anime endpoint')
    const payload = await getPayload<AnimeDetailsPayload>(`${PREFIX}/anime/${slug}`)

    return {
      title: payload.title,
      japanese_title: payload.alternativeTitle,
      poster: payload.poster,
      rating: payload.rating,
      type: payload.type,
      studio: payload.studio,
      release_date: payload.season,
      duration: payload.duration,
      produser: payload.credit,
      episode_count: String(payload.episodeList?.length ?? ''),
      genres: (payload.categories ?? []).map(genreFromLink),
      synopsis: payload.synopsis,
      batch: null,
      episode_lists: (payload.episodeList ?? []).map((episode) => ({
        episode: episode.title,
        slug: episodeSlug(endpoint, episode.episode),
      })),
      recommendations: [],
    }
  },

  async getEpisode(endpoint: string): Promise<EpisodeDetail> {
    const [animeSlug, episode] = splitCompositeSlug(endpoint)

    if (!animeSlug || !episode) {
      throw new Error('Episode endpoint harus berbentuk <slug anime>/<nomor episode>.')
    }

    const payload = await getPayload<EpisodeDetailsPayload>(
      `${PREFIX}/episode/${animeSlug}/${episode}`,
    )

    const decodedSlug = decodeURIComponent(animeSlug)
    const prev = payload.navigation?.prev ?? null
    const next = payload.navigation?.next ?? null

    // Tiap resolusi sudah berupa halaman pemutar tersendiri, jadi bisa langsung
    // dipakai sebagai pilihan server tanpa permintaan tambahan.
    const servers = (payload.streamSources ?? []).map((source) => ({
      title: source.format || 'Default',
      serverId: source.url,
    }))

    return {
      episode: payload.title,
      anime: { slug: decodedSlug },
      has_previous_episode: prev !== null,
      previous_episode: prev !== null ? { slug: episodeSlug(decodedSlug, prev) } : null,
      has_next_episode: next !== null,
      next_episode: next !== null ? { slug: episodeSlug(decodedSlug, next) } : null,
      iframe_url: servers[0]?.serverId ?? '',
      servers,
      download_urls: toDownloadUrls(payload.downloadLinks),
    }
  },

  /** serverId sudah berupa URL pemutar — tidak perlu diselesaikan lagi. */
  getStreamServer(server: StreamServer): Promise<string> {
    return Promise.resolve(server.serverId)
  },
}
