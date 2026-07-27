import axios from 'axios'
import type { Genre, Pagination } from '../../types/anime'

export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
})

/* ===== Bentuk umum respons superanime ===== */

export type SuperPagination = {
  currentPage: number
  prevPage: number | null
  nextPage: number | null
  totalPages: number
  hasPrevPage: boolean
  hasNextPage: boolean
}

export type ApiEnvelope<T> = {
  statusCode: number
  statusMessage: string
  message: string
  data?: T
  pagination?: SuperPagination | null
}

export type UrlLink = {
  title: string
  url: string
}

export type Server = {
  title: string
  serverId: string
}

export type Quality = {
  title: string
  size: string
  urlList?: UrlLink[]
}

export type Format = {
  title: string
  qualityList: Quality[]
}

/* ===== Utilitas permintaan ===== */

const parseErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'Unexpected error. Please try again.'
  }

  if (!error.response) {
    return `Tidak bisa terhubung ke API di ${BASE_URL}. Pastikan server superanime sedang berjalan.`
  }

  const serverMessage =
    typeof error.response.data?.message === 'string' && error.response.data.message
      ? error.response.data.message
      : null

  return serverMessage ?? `Request failed with status ${error.response.status}.`
}

export type RequestConfig = { params?: Record<string, string | number> }

export const request = async <T>(
  url: string,
  config?: RequestConfig,
): Promise<ApiEnvelope<T>> => {
  try {
    const response = await http.get<ApiEnvelope<T>>(url, config)
    return response.data
  } catch (error) {
    throw new Error(parseErrorMessage(error), { cause: error })
  }
}

export const getPayload = async <T>(url: string, config?: RequestConfig): Promise<T> => {
  const envelope = await request<T>(url, config)

  if (envelope.data === undefined) {
    throw new Error(envelope.message || 'No data returned from API.')
  }

  return envelope.data
}

export const requirePayload = async <T>(
  url: string,
  config?: RequestConfig,
): Promise<{ data: T; pagination: Pagination | null }> => {
  const envelope = await request<T>(url, config)

  if (envelope.data === undefined) {
    throw new Error(envelope.message || 'No data returned from API.')
  }

  return { data: envelope.data, pagination: toPagination(envelope.pagination) }
}

export const encodeSegment = (value: string, label: string): string => {
  const cleaned = value.trim()

  if (!cleaned) {
    throw new Error(`${label} is required.`)
  }

  return encodeURIComponent(cleaned)
}

/** Ambil segmen terakhir sebuah URL sebagai id/slug. */
export const idFromUrl = (value?: string): string | undefined => {
  const cleaned = value?.trim()

  if (!cleaned) {
    return undefined
  }

  const withoutQuery = cleaned.split(/[?#]/)[0] ?? cleaned
  const last = withoutQuery.split('/').filter(Boolean).at(-1)

  return last && !last.endsWith(':') ? last : undefined
}

export const toPagination = (pagination?: SuperPagination | null): Pagination | null => {
  if (!pagination) {
    return null
  }

  return {
    current_page: pagination.currentPage,
    last_visible_page: pagination.totalPages,
    has_next_page: pagination.hasNextPage,
    next_page: pagination.nextPage,
    has_previous_page: pagination.hasPrevPage,
    previous_page: pagination.prevPage,
  }
}

export const genreFromLink = (link: UrlLink): Genre => ({
  name: link.title,
  slug: idFromUrl(link.url),
  otakudesu_url: link.url,
})

export const genreFromName = (name: string): Genre => ({
  name,
  slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
})

const RESOLUTION_PATTERN = /(\d{3,4}p)/i

/**
 * Ubah `Format[]` milik superanime menjadi pengelompokan mp4/mkv yang dipakai
 * halaman tonton. Wadah file ditentukan dari judul kualitas ("Mp4 360p"),
 * dengan judul format sebagai cadangan.
 */
export const toDownloadUrls = (formats: Format[] = []) => {
  const result = {
    mp4: [] as { resolution?: string; urls: { provider?: string; url?: string }[] }[],
    mkv: [] as { resolution?: string; urls: { provider?: string; url?: string }[] }[],
  }

  formats.forEach((format) => {
    ;(format.qualityList ?? []).forEach((quality) => {
      const isMkv = /mkv/i.test(quality.title) || /mkv/i.test(format.title)
      const bucket = isMkv ? result.mkv : result.mp4

      const urls = (quality.urlList ?? [])
        .filter((link) => link.url)
        .map((link) => ({ provider: link.title, url: link.url }))

      if (urls.length === 0) {
        return
      }

      const resolution =
        quality.title.match(RESOLUTION_PATTERN)?.[1] ??
        format.title.match(RESOLUTION_PATTERN)?.[1] ??
        quality.title

      bucket.push({ resolution, urls })
    })
  })

  return result
}

/**
 * Slug gabungan (mis. `5069/azur-lane`) dipakai beberapa sumber. Slug disimpan
 * dalam bentuk ter-encode supaya tetap satu segmen URL, lalu dipecah kembali
 * saat memanggil API.
 */
export const encodeCompositeSlug = (...parts: string[]): string =>
  encodeURIComponent(parts.filter(Boolean).join('/'))

export const splitCompositeSlug = (slug: string): string[] => {
  // React Router sudah men-decode parameter rutenya, tapi slug bisa juga
  // datang dalam bentuk ter-encode (mis. dari cache atau tautan tersimpan).
  let decoded = slug.trim()

  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    // Biarkan apa adanya kalau bukan percent-encoding yang sah.
  }

  return decoded
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
}
