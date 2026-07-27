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

/**
 * Tidak semua sumber menyediakan fitur yang sama. Deskriptor ini dipakai
 * Navbar dan router untuk menyembunyikan menu yang tidak didukung sumber aktif,
 * supaya pengguna tidak pernah mendarat di halaman kosong.
 */
export interface SourceCapabilities {
  /** Daftar ongoing berhalaman. */
  ongoing: boolean
  /** Daftar completed berhalaman. */
  completed: boolean
  search: boolean
  genres: boolean
  /** Jadwal rilis yang dikelompokkan per hari. */
  schedule: boolean
  /** Katalog A-Z lengkap. */
  animeList: boolean
  /** Halaman tonton — sumber menyediakan URL pemutar. */
  streaming: boolean
}

export interface SourceAdapter {
  id: string
  label: string
  capabilities: SourceCapabilities

  getHome(): Promise<{ ongoing: AnimeItem[]; complete: AnimeItem[] }>
  getOngoingPage(page?: number): Promise<PagedItems<AnimeItem>>
  getCompletePage(page?: number): Promise<PagedItems<AnimeItem>>
  getSchedule(): Promise<ScheduleDay[]>
  getAnimeCollections(): Promise<AnimeCollection[]>
  getGenres(): Promise<Genre[]>
  getAnimeByGenre(genreSlug: string, page?: number): Promise<PagedItems<AnimeItem>>
  searchAnime(query: string): Promise<AnimeItem[]>
  getDetail(endpoint: string): Promise<AnimeDetail>
  getEpisode(endpoint: string): Promise<EpisodeDetail>
  getStreamServer(server: StreamServer): Promise<string>
}

/** Dilempar ketika halaman meminta fitur yang tidak dimiliki sumber aktif. */
export class UnsupportedFeatureError extends Error {
  constructor(sourceLabel: string, feature: string) {
    super(`${feature} tidak tersedia untuk sumber ${sourceLabel}.`)
    this.name = 'UnsupportedFeatureError'
  }
}
