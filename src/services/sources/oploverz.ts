import type {
  AnimeCollection,
  AnimeDetail,
  AnimeItem,
  EpisodeDetail,
  Genre,
  PagedItems,
  ScheduleDay,
} from '../../types/anime'
import { UnsupportedFeatureError, type SourceAdapter } from './types'
import {
  encodeSegment,
  genreFromLink,
  getPayload,
  idFromUrl,
  requirePayload,
  toDownloadUrls,
  type Format,
  type UrlLink,
} from './shared'

const PREFIX = '/oploverz'
const LABEL = 'Oploverz'

type AnimeCard = {
  title: string
  slug: string
  poster: string
  type: string
  episode: string
  score: string
  status: string
  genres: UrlLink[]
  seriesUrl?: string
  sourceUrl?: string
}

type EpisodeItem = { episode: number; title: string; date: string; url: string }

type AnimeDetailsPayload = {
  title: string
  poster: string
  rating: string
  status: string
  studio: string
  season: string
  type: string
  synopsis: { paragraphList: string[] }
  genreList: UrlLink[]
  episodeList: EpisodeItem[]
  alternativeTitle: string
}

type EpisodeDetailsPayload = {
  title: string
  episode: number
  poster: string
  iframe: string
  navigation: { prev: string | null; next: string | null }
  downloadLinks: Format[]
  seriesUrl: string
}

/**
 * Judul kartu Oploverz kerap berisi teks ganda yang dipisah tab
 * ("Judul\t\t\tJudul"). Diambil bagian pertamanya saja.
 */
const cleanTitle = (value: string): string => {
  const [first] = value.split(/\t+/).map((part) => part.trim()).filter(Boolean)
  return first ?? value.trim()
}

const fromCard = (card: AnimeCard): AnimeItem => ({
  title: cleanTitle(card.title),
  slug: card.slug,
  poster: card.poster,
  current_episode: card.episode,
  rating: card.score,
  status: card.status,
  type: card.type,
  genres: (card.genres ?? []).map(genreFromLink),
  otakudesu_url: card.seriesUrl ?? card.sourceUrl,
})

export const oploverzAdapter: SourceAdapter = {
  id: 'oploverz',
  label: LABEL,
  capabilities: {
    ongoing: true,
    completed: true,
    search: true,
    genres: true,
    schedule: true,
    // Oploverz tidak punya katalog A-Z.
    animeList: false,
    streaming: true,
  },

  async getHome() {
    // Beranda Oploverz memakai popular/latest/recommended, bukan
    // ongoing/completed — jadi keduanya diambil dari endpoint khusus.
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

  getAnimeCollections(): Promise<AnimeCollection[]> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Daftar anime A-Z'))
  },

  async getGenres(): Promise<Genre[]> {
    const data = await getPayload<{ title: string; genreId: string; sourceUrl?: string }[]>(
      `${PREFIX}/genre`,
    )
    return data.map((genre) => ({
      // Oploverz menulis genre dalam huruf kecil semua.
      name: genre.title.replace(/\b\w/g, (char) => char.toUpperCase()),
      slug: genre.genreId,
      otakudesu_url: genre.sourceUrl,
    }))
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
      title: cleanTitle(payload.title),
      japanese_title: payload.alternativeTitle,
      poster: payload.poster,
      // Oploverz menulis "Rating 8.16"; angkanya saja yang dipakai.
      rating: payload.rating?.replace(/^rating\s*/i, '') ?? '',
      type: payload.type,
      status: payload.status,
      studio: payload.studio,
      release_date: payload.season,
      genres: (payload.genreList ?? []).map(genreFromLink),
      synopsis: (payload.synopsis?.paragraphList ?? []).join('\n\n'),
      batch: null,
      episode_lists: (payload.episodeList ?? []).map((episode) => ({
        episode: episode.title,
        slug: idFromUrl(episode.url),
        otakudesu_url: episode.url,
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
      anime: { slug: idFromUrl(payload.seriesUrl), otakudesu_url: payload.seriesUrl },
      has_previous_episode: Boolean(prev),
      previous_episode: prev ? { slug: idFromUrl(prev), otakudesu_url: prev } : null,
      has_next_episode: Boolean(next),
      next_episode: next ? { slug: idFromUrl(next), otakudesu_url: next } : null,
      iframe_url: payload.iframe ?? '',
      servers: [],
      download_urls: toDownloadUrls(payload.downloadLinks),
    }
  },

  getStreamServer(): Promise<string> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Server streaming alternatif'))
  },
}
