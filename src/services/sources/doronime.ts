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
  genreFromLink,
  getPayload,
  idFromUrl,
  requirePayload,
  splitCompositeSlug,
  toDownloadUrls,
  type Format,
  type UrlLink,
} from './shared'

const PREFIX = '/doronime'
const LABEL = 'Doronime (Download)'

type AnimeCard = {
  title: string
  slug: string
  poster: string
  status: string
  type: string
  score: string
  sourceUrl?: string
}

type EpisodeItem = { episode: number; title: string; date: string; url: string }

type AnimeDetailsPayload = {
  title: string
  poster: string
  romaji: string
  english: string
  alternativeTitle: string
  status: string
  duration: string
  genreList: UrlLink[]
  season: string
  producer: string
  studio: string
  releaseDate: string
  totalEpisode: string
  score: string
  synopsis: string
  episodeList: EpisodeItem[]
}

type EpisodeDetailsPayload = {
  title: string
  episode: number
  animeSlug: string
  animeUrl: string
  navigation: { prev: string | null; next: string | null }
  downloadLinks: Format[]
}

const fromCard = (card: AnimeCard): AnimeItem => ({
  title: card.title,
  slug: card.slug,
  poster: card.poster,
  rating: card.score,
  status: card.status,
  type: card.type,
  otakudesu_url: card.sourceUrl,
})

/** Episode Doronime dialamatkan sebagai `<slug anime>/<slug episode>`. */
const episodeSlug = (animeSlug: string, episodeUrl: string) => {
  const segments = episodeUrl.split('/').filter(Boolean)
  return encodeCompositeSlug(animeSlug, segments.at(-1) ?? '')
}

export const doronimeAdapter: SourceAdapter = {
  id: 'doronime',
  label: LABEL,
  capabilities: {
    ongoing: true,
    // Tidak ada daftar completed tersendiri; katalognya satu aliran.
    completed: false,
    search: true,
    genres: true,
    // Doronime tidak menerbitkan hari tayang — isi `/schedule` hanya
    // pengelompokan per penerjemah, jadi tidak dipakai sebagai jadwal rilis.
    schedule: false,
    animeList: true,
    // Doronime tidak punya pemutar sama sekali — tiap episode hanya berisi
    // tautan unduhan, jadi halaman tonton tidak pernah dibuka untuk sumber ini.
    streaming: false,
    downloadOnly: true,
  },

  async getHome() {
    const ongoing = await this.getOngoingPage(1)
    return { ongoing: ongoing.items, complete: [] }
  },

  async getOngoingPage(page = 1): Promise<PagedItems<AnimeItem>> {
    const { data, pagination } = await requirePayload<AnimeCard[]>(`${PREFIX}/anime`, {
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

  async getAnimeCollections(): Promise<AnimeCollection[]> {
    const data = await getPayload<{ initial: string; animeList: UrlLink[] }[]>(
      `${PREFIX}/anime-list`,
    )
    return data.map((entry) => ({
      initial: entry.initial,
      items: (entry.animeList ?? []).map((link) => ({
        title: link.title,
        slug: idFromUrl(link.url),
        otakudesu_url: link.url,
      })),
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
      japanese_title: payload.romaji || payload.alternativeTitle,
      poster: payload.poster,
      rating: payload.score,
      type: payload.totalEpisode,
      status: payload.status,
      studio: payload.studio,
      release_date: payload.releaseDate,
      genres: (payload.genreList ?? []).map(genreFromLink),
      synopsis: payload.synopsis,
      batch: null,
      episode_lists: (payload.episodeList ?? []).map((episode) => ({
        episode: episode.title,
        slug: episodeSlug(endpoint, episode.url),
        otakudesu_url: episode.url,
      })),
      recommendations: [],
    }
  },

  async getEpisode(endpoint: string): Promise<EpisodeDetail> {
    const [animeSlug, episode] = splitCompositeSlug(endpoint)

    if (!animeSlug || !episode) {
      throw new Error('Episode endpoint harus berbentuk <slug anime>/<slug episode>.')
    }

    const payload = await getPayload<EpisodeDetailsPayload>(
      `${PREFIX}/episode/${encodeURIComponent(animeSlug)}/${encodeURIComponent(episode)}`,
    )

    const prev = payload.navigation?.prev ?? null
    const next = payload.navigation?.next ?? null

    return {
      episode: payload.title,
      anime: { slug: payload.animeSlug || animeSlug, otakudesu_url: payload.animeUrl },
      has_previous_episode: Boolean(prev),
      previous_episode: prev
        ? { slug: episodeSlug(animeSlug, prev), otakudesu_url: prev }
        : null,
      has_next_episode: Boolean(next),
      next_episode: next ? { slug: episodeSlug(animeSlug, next), otakudesu_url: next } : null,
      // Tanpa pemutar: halaman tonton tidak dipakai, hanya daftar unduhannya.
      iframe_url: '',
      servers: [],
      download_urls: toDownloadUrls(payload.downloadLinks),
    }
  },

  getStreamServer(): Promise<string> {
    return Promise.reject(new UnsupportedFeatureError(LABEL, 'Streaming'))
  },

  /**
   * Tautan unduhannya masih menunjuk halaman safelink Doronime. Backend yang
   * melewatinya supaya pengguna langsung mendapat URL host (Google Drive,
   * AceFile) tanpa hitungan mundur dan halaman iklan.
   */
  async resolveDownload(downloadUrl: string): Promise<string> {
    const id = new URL(downloadUrl).searchParams.get('id')
    if (!id) return downloadUrl

    const { url } = await getPayload<{ url: string }>(
      `${PREFIX}/download/${encodeURIComponent(id)}`,
    )
    return url || downloadUrl
  },
}
