import axios from 'axios'
import type {
  AnimeDetail,
  AnimeItem,
  EpisodeDetail,
  Genre,
  PagedItems,
  Pagination,
} from '../types/anime'

const API_PREFIX = '/v1'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
})

type ApiEnvelope<T> = {
  status: string
  data?: T
  message?: string
  pagination?: Pagination
}

type EpisodeApiPayload = Omit<EpisodeDetail, 'iframe_url'> & {
  stream_url?: string
}

type AnimeByGenrePayload = {
  anime: AnimeItem[]
  pagination: Pagination | false
}

const parseErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'Unexpected error. Please try again.'
  }

  if (!error.response) {
    return 'Cannot connect to local API at http://localhost:3000. Ensure your scraper server is running.'
  }

  const serverMessage =
    typeof error.response.data?.message === 'string'
      ? error.response.data.message
      : null

  if (serverMessage) {
    return serverMessage
  }

  return `Request failed with status ${error.response.status}.`
}

const encodeSegment = (value: string, label: string): string => {
  const cleaned = value.trim()

  if (!cleaned) {
    throw new Error(`${label} is required.`)
  }

  return encodeURIComponent(cleaned)
}

const getPayload = async <T>(url: string): Promise<T> => {
  try {
    const response = await api.get<ApiEnvelope<T>>(url)

    if (response.data.data === undefined) {
      throw new Error(response.data.message ?? 'No data returned from API.')
    }

    return response.data.data
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) {
      throw error
    }

    throw new Error(parseErrorMessage(error), { cause: error })
  }
}

const getEnvelope = async <T>(url: string): Promise<ApiEnvelope<T>> => {
  try {
    const response = await api.get<ApiEnvelope<T>>(url)
    return response.data
  } catch (error) {
    throw new Error(parseErrorMessage(error), { cause: error })
  }
}

const withPage = (basePath: string, page: number): string => {
  return page > 1 ? `${basePath}/${page}` : basePath
}

export const getOngoingPage = async (page = 1): Promise<PagedItems<AnimeItem>> => {
  const result = await getEnvelope<AnimeItem[]>(withPage(`${API_PREFIX}/ongoing-anime`, page))

  if (result.data === undefined) {
    throw new Error(result.message ?? 'No ongoing anime data returned from API.')
  }

  return {
    items: result.data,
    pagination: result.pagination ?? null,
  }
}

export const getCompletePage = async (page = 1): Promise<PagedItems<AnimeItem>> => {
  const result = await getEnvelope<AnimeItem[]>(withPage(`${API_PREFIX}/complete-anime`, page))

  if (result.data === undefined) {
    throw new Error(result.message ?? 'No completed anime data returned from API.')
  }

  return {
    items: result.data,
    pagination: result.pagination ?? null,
  }
}

export const getOngoing = async (page = 1): Promise<AnimeItem[]> => {
  const result = await getOngoingPage(page)
  return result.items
}

export const getComplete = async (page = 1): Promise<AnimeItem[]> => {
  const result = await getCompletePage(page)
  return result.items
}

export const getDetail = async (endpoint: string): Promise<AnimeDetail> => {
  const slug = encodeSegment(endpoint, 'Anime endpoint')
  return getPayload<AnimeDetail>(`${API_PREFIX}/anime/${slug}`)
}

export const getEpisode = async (endpoint: string): Promise<EpisodeDetail> => {
  const slug = encodeSegment(endpoint, 'Episode endpoint')
  const data = await getPayload<EpisodeApiPayload>(`${API_PREFIX}/episode/${slug}`)

  return {
    ...data,
    iframe_url: data.stream_url ?? '',
  }
}

export const searchAnime = async (query: string): Promise<AnimeItem[]> => {
  const keyword = query.trim()

  if (!keyword) {
    return []
  }

  return getPayload<AnimeItem[]>(`${API_PREFIX}/search/${encodeURIComponent(keyword)}`)
}

export const getGenres = async (): Promise<Genre[]> => {
  return getPayload<Genre[]>(`${API_PREFIX}/genres`)
}

export const getAnimeByGenre = async (genreSlug: string, page = 1): Promise<PagedItems<AnimeItem>> => {
  const slug = encodeSegment(genreSlug, 'Genre slug')
  const path = withPage(`${API_PREFIX}/genres/${slug}`, page)
  const data = await getPayload<AnimeByGenrePayload>(path)

  return {
    items: data.anime,
    pagination: data.pagination === false ? null : data.pagination,
  }
}

export default api