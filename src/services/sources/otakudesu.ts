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
import {
  encodeSegment,
  genreFromLink,
  genreFromName,
  getPayload,
  idFromUrl,
  requirePayload,
  toDownloadUrls,
  type Format,
  type Server,
  type UrlLink,
} from './shared'

const PREFIX = '/otakudesu'

type OngoingCard = {
  title: string
  poster: string
  episodes: string
  animeId: string
  releaseDay: string
  releaseDate: string
  sourceUrl?: string
}

type CompletedCard = {
  title: string
  poster: string
  episodes: string
  animeId: string
  score: string
  lastRelease: string
  sourceUrl?: string
}

type SearchedAnime = {
  title: string
  poster: string
  score: string
  status: string
  genres: string[]
  animeId: string
  sourceUrl?: string
}

type GenreFilteredAnime = {
  title: string
  poster: string
  synopsis: string
  studios: string
  season: string
  score: string
  status: string
  genres: UrlLink[]
  animeId: string
  sourceUrl?: string
}

type RecommendedAnime = { title: string; url: string; poster: string; animeId: string }

type AnimeDetailsPayload = {
  title: string
  japanese: string
  score: string
  producers: string
  type: string
  status: string
  episodes: string
  duration: string
  aired: string
  studios: string
  poster: string
  synopsis: { paragraphList: string[] }
  batchLink: UrlLink | null
  genreList: UrlLink[]
  episodeList: UrlLink[]
  recommendedAnimeList: RecommendedAnime[]
}

type EpisodeDetailsPayload = {
  title: string
  navigation: { prev: UrlLink | null; next: UrlLink | null }
  defaultStreaming: string
  downloadLinks: Format[]
  serverList: Server[]
  animeId?: string
  animeUrl?: string
}

const fromOngoing = (card: OngoingCard): AnimeItem => ({
  title: card.title,
  slug: card.animeId,
  poster: card.poster,
  current_episode: card.episodes,
  release_day: card.releaseDay,
  newest_release_date: card.releaseDate,
  otakudesu_url: card.sourceUrl,
})

const fromCompleted = (card: CompletedCard): AnimeItem => ({
  title: card.title,
  slug: card.animeId,
  poster: card.poster,
  episode_count: card.episodes,
  rating: card.score,
  last_release_date: card.lastRelease,
  status: 'Completed',
  otakudesu_url: card.sourceUrl,
})

const fromUrlLink = (link: UrlLink): AnimeItem => ({
  title: link.title,
  slug: idFromUrl(link.url),
  otakudesu_url: link.url,
})

export const otakudesuAdapter: SourceAdapter = {
  id: 'otakudesu',
  label: 'Otakudesu',
  capabilities: {
    ongoing: true,
    completed: true,
    search: true,
    genres: true,
    schedule: true,
    animeList: true,
    streaming: true,
  },

  async getHome() {
    const data = await getPayload<{ ongoing: OngoingCard[]; completed: CompletedCard[] }>(
      `${PREFIX}/home`,
    )

    return {
      ongoing: (data.ongoing ?? []).map(fromOngoing),
      complete: (data.completed ?? []).map(fromCompleted),
    }
  },

  async getOngoingPage(page = 1): Promise<PagedItems<AnimeItem>> {
    const { data, pagination } = await requirePayload<OngoingCard[]>(`${PREFIX}/ongoing`, {
      params: { page },
    })
    return { items: data.map(fromOngoing), pagination }
  },

  async getCompletePage(page = 1): Promise<PagedItems<AnimeItem>> {
    const { data, pagination } = await requirePayload<CompletedCard[]>(`${PREFIX}/completed`, {
      params: { page },
    })
    return { items: data.map(fromCompleted), pagination }
  },

  async getSchedule(): Promise<ScheduleDay[]> {
    const data = await getPayload<{ day: string; animeList: UrlLink[] }[]>(`${PREFIX}/schedule`)

    return data
      .map((entry) => ({ day: entry.day, items: (entry.animeList ?? []).map(fromUrlLink) }))
      .filter((entry) => entry.items.length > 0)
  },

  async getAnimeCollections(): Promise<AnimeCollection[]> {
    const data = await getPayload<{ initial: string; animeList: UrlLink[] }[]>(`${PREFIX}/anime`)
    return data.map((entry) => ({
      initial: entry.initial,
      items: (entry.animeList ?? []).map(fromUrlLink),
    }))
  },

  async getGenres(): Promise<Genre[]> {
    const data = await getPayload<{ title: string; genreId: string; sourceUrl?: string }[]>(
      `${PREFIX}/genre`,
    )
    return data.map((genre) => ({
      name: genre.title,
      slug: genre.genreId,
      otakudesu_url: genre.sourceUrl,
    }))
  },

  async getAnimeByGenre(genreSlug: string, page = 1): Promise<PagedItems<AnimeItem>> {
    const genreId = encodeSegment(genreSlug, 'Genre slug')
    const { data, pagination } = await requirePayload<GenreFilteredAnime[]>(
      `${PREFIX}/genre/${genreId}`,
      { params: { page } },
    )

    return {
      items: data.map((item) => ({
        title: item.title,
        slug: item.animeId,
        poster: item.poster,
        synopsis: item.synopsis,
        studio: item.studios,
        season: item.season,
        rating: item.score,
        status: item.status,
        genres: item.genres.map(genreFromLink),
        otakudesu_url: item.sourceUrl,
      })),
      pagination,
    }
  },

  async searchAnime(query: string): Promise<AnimeItem[]> {
    const keyword = query.trim()
    if (!keyword) return []

    const data = await getPayload<SearchedAnime[]>(`${PREFIX}/search`, { params: { q: keyword } })
    return data.map((item) => ({
      title: item.title,
      slug: item.animeId,
      poster: item.poster,
      rating: item.score,
      status: item.status,
      genres: item.genres.map(genreFromName),
      otakudesu_url: item.sourceUrl,
    }))
  },

  async getDetail(endpoint: string): Promise<AnimeDetail> {
    const animeId = encodeSegment(endpoint, 'Anime endpoint')
    const payload = await getPayload<AnimeDetailsPayload>(`${PREFIX}/anime/${animeId}`)

    return {
      title: payload.title,
      japanese_title: payload.japanese,
      poster: payload.poster,
      rating: payload.score,
      produser: payload.producers,
      type: payload.type,
      status: payload.status,
      episode_count: payload.episodes,
      duration: payload.duration,
      release_date: payload.aired,
      studio: payload.studios,
      genres: (payload.genreList ?? []).map(genreFromLink),
      synopsis: (payload.synopsis?.paragraphList ?? []).join('\n\n'),
      batch: payload.batchLink
        ? { slug: idFromUrl(payload.batchLink.url), otakudesu_url: payload.batchLink.url }
        : null,
      episode_lists: (payload.episodeList ?? []).map((episode) => ({
        episode: episode.title,
        slug: idFromUrl(episode.url),
        otakudesu_url: episode.url,
      })),
      recommendations: (payload.recommendedAnimeList ?? []).map((item) => ({
        title: item.title,
        slug: item.animeId || idFromUrl(item.url),
        poster: item.poster,
        otakudesu_url: item.url,
      })),
    }
  },

  async getEpisode(endpoint: string): Promise<EpisodeDetail> {
    const episodeId = encodeSegment(endpoint, 'Episode endpoint')
    const payload = await getPayload<EpisodeDetailsPayload>(`${PREFIX}/episode/${episodeId}`)

    const prev = payload.navigation?.prev ?? null
    const next = payload.navigation?.next ?? null

    return {
      episode: payload.title,
      anime: { slug: payload.animeId || undefined, otakudesu_url: payload.animeUrl },
      has_previous_episode: Boolean(prev),
      previous_episode: prev ? { slug: idFromUrl(prev.url), otakudesu_url: prev.url } : null,
      has_next_episode: Boolean(next),
      next_episode: next ? { slug: idFromUrl(next.url), otakudesu_url: next.url } : null,
      iframe_url: payload.defaultStreaming ?? '',
      servers: (payload.serverList ?? []).filter((server) => server.serverId),
      download_urls: toDownloadUrls(payload.downloadLinks),
    }
  },

  async getStreamServer(server: StreamServer): Promise<string> {
    const serverId = encodeSegment(server.serverId, 'Server id')
    const data = await getPayload<{ title: string; url: string }>(`${PREFIX}/server/${serverId}`)
    return data.url
  },
}
