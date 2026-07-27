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
    // URL video dihasilkan skrip ter-obfuscate dengan token berputar, jadi
    // tidak bisa diambil dari sisi server.
    streaming: false,
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
      // Sengaja dikosongkan: episodenya tidak bisa diputar dari sumber ini.
      episode_lists: [],
      recommendations: [],
    }
  },

  getEpisode(): Promise<EpisodeDetail> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Pemutaran episode'))
  },

  getStreamServer(): Promise<string> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Server streaming'))
  },
}
