import type { AnimeItem } from '../types/anime'

const CACHE_KEY = 'anime-list-cache-v1'
const CACHE_TTL_MS = 5 * 60 * 1000

type CachedPayload = {
  items: AnimeItem[]
  savedAt: number
}

export const loadCachedAnimeList = (): AnimeItem[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as CachedPayload
    if (!parsed?.items?.length) {
      return null
    }

    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      return null
    }

    return parsed.items
  } catch {
    return null
  }
}

export const saveCachedAnimeList = (items: AnimeItem[]): void => {
  try {
    const payload = JSON.stringify({ items, savedAt: Date.now() })
    localStorage.setItem(CACHE_KEY, payload)
  } catch {
    // Ignore cache write failures.
  }
}
