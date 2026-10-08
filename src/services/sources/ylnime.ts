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
import type { SourceAdapter } from './types'
import { encodeSegment, getPayload, requirePayload } from './shared'

const PREFIX = '/ylnime'
const LABEL = 'YLnime'

type AnimeCard = {
  title: string
  slug: string
  poster: string
  label: string
  score: string
  status: string
  sourceUrl: string
}

type GenreCard = { title: string; genreId: string }

type AnimeDetailsPayload = {
  title: string
  poster: string
  status: string
  type: string
  year: string
  score: string
  synopsis: string
  genreList: GenreCard[]
  episodeList: { title: string; slug: string; date: string }[]
  sourceUrl: string
}

type EpisodeDetailsPayload = {
  title: string
  animeTitle: string
  animeSlug: string
  navigation: { prev: string | null; next: string | null }
  serverList: StreamServer[]
  defaultStreaming: string
  sourceUrl: string
}

const fromCard = (card: AnimeCard): AnimeItem => ({
  title: card.title,
  slug: card.slug,
  poster: card.poster,
  current_episode: card.label || undefined,
  rating: card.score,
  status: card.status || undefined,
  otakudesu_url: card.sourceUrl,
})

const fromGenre = (genre: GenreCard): Genre => ({ name: genre.title, slug: genre.genreId })

export const ylnimeAdapter: SourceAdapter = {
  id: 'ylnime',
  label: LABEL,
  capabilities: {
    ongoing: true,
    completed: true,
    search: true,
    genres: true,
    schedule: true,
    animeList: true,
    streaming: true,
    downloadOnly: false,
  },

  async getHome() {
    const [ongoing, complete] = await Promise.all([
      this.getOngoingPage(1),
      this.getCompletePage(1),
    ])
    return { ongoing: ongoing.items, complete: complete.items }
  },

  async getOngoingPage(page = 1): Promise<PagedItems<AnimeItem>> {
    const { data, pagination } = await requirePayload<AnimeCard[]>(`${PREFIX}/ongoing`, {
      params: { page },
    })
    return { items: data.map(fromCard), pagination }
  },

  async getCompletePage(page = 1): Promise<PagedItems<AnimeItem>> {
    const { data, pagination } = await requirePayload<AnimeCard[]>(`${PREFIX}/completed`, {
      params: { page },
    })
    return { items: data.map(fromCard), pagination }
  },

  async getSchedule(): Promise<ScheduleDay[]> {
    const data = await getPayload<{ day: string; animeList: AnimeCard[] }[]>(`${PREFIX}/schedule`)
    return data
      .map((entry) => ({ day: entry.day, items: (entry.animeList ?? []).map(fromCard) }))
      .filter((entry) => entry.items.length > 0)
  },

  /** Katalog YLnime per huruf diambil lewat `getAnimeListPage` di services/api. */
  async getAnimeCollections(): Promise<AnimeCollection[]> {
    return []
  },

  async getGenres(): Promise<Genre[]> {
    const data = await getPayload<GenreCard[]>(`${PREFIX}/genre`)
    return data.map(fromGenre)
  },

  async getAnimeByGenre(genreSlug: string, page = 1): Promise<PagedItems<AnimeItem>> {
    const genreId = encodeSegment(genreSlug, 'Genre slug')
    const { data, pagination } = await requirePayload<AnimeCard[]>(`${PREFIX}/genres/${genreId}`, {
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
      poster: payload.poster,
      rating: payload.score,
      type: payload.type,
      status: payload.status,
      release_date: payload.year,
      genres: (payload.genreList ?? []).map(fromGenre),
      synopsis: payload.synopsis,
      batch: null,
      episode_lists: (payload.episodeList ?? []).map((episode) => ({
        episode: episode.title,
        slug: episode.slug,
      })),
      recommendations: [],
    }
  },

  async getEpisode(endpoint: string): Promise<EpisodeDetail> {
    const slug = encodeSegment(endpoint, 'Episode endpoint')
    const payload = await getPayload<EpisodeDetailsPayload>(`${PREFIX}/episode/${slug}`)

    const prev = payload.navigation?.prev ?? null
    const next = payload.navigation?.next ?? null

    return {
      episode: payload.title,
      anime: { slug: payload.animeSlug },
      has_previous_episode: Boolean(prev),
      previous_episode: prev ? { slug: prev } : null,
      has_next_episode: Boolean(next),
      next_episode: next ? { slug: next } : null,
      iframe_url: payload.defaultStreaming,
      servers: payload.serverList ?? [],
      download_urls: { mp4: [], mkv: [] },
    }
  },

  /** serverId sudah berupa URL file video — tidak perlu diselesaikan lagi. */
  getStreamServer(server: StreamServer): Promise<string> {
    return Promise.resolve(server.serverId)
  },
}
