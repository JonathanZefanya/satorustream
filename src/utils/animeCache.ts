import type { AnimeItem } from '../types/anime'
import { readJson, scopedKey, writeJson } from './storage'

// Kunci dipisah per sumber: katalog Otakudesu tidak boleh muncul saat pengguna
// sedang memakai Oploverz.
const CACHE_KEY = 'anime-list-cache-v1'
const CACHE_TTL_MS = 5 * 60 * 1000

type CachedPayload = {
  items: AnimeItem[]
  savedAt: number
}

export const loadCachedAnimeList = (): AnimeItem[] | null => {
  const parsed = readJson<CachedPayload>(scopedKey(CACHE_KEY))

  if (!parsed?.items?.length) {
    return null
  }

  if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
    return null
  }

  return parsed.items
}

export const saveCachedAnimeList = (items: AnimeItem[]): void => {
  writeJson(scopedKey(CACHE_KEY), { items, savedAt: Date.now() })
}

/**
 * Endpoint daftar A-Z hanya memberi judul dan slug, tanpa poster. Poster
 * dikumpulkan terpisah dari halaman ongoing/completed lalu disimpan lebih lama
 * karena pengambilannya mahal (banyak halaman).
 */
const POSTER_CACHE_KEY = 'anime-poster-index-v1'
const POSTER_CACHE_TTL_MS = 60 * 60 * 1000

export type PosterIndex = Record<string, string>

type CachedPosterPayload = {
  posters: PosterIndex
  savedAt: number
}

export const loadCachedPosterIndex = (): PosterIndex | null => {
  const parsed = readJson<CachedPosterPayload>(scopedKey(POSTER_CACHE_KEY))

  if (!parsed?.posters || Object.keys(parsed.posters).length === 0) {
    return null
  }

  if (Date.now() - parsed.savedAt > POSTER_CACHE_TTL_MS) {
    return null
  }

  return parsed.posters
}

export const saveCachedPosterIndex = (posters: PosterIndex): void => {
  writeJson(scopedKey(POSTER_CACHE_KEY), { posters, savedAt: Date.now() })
}
