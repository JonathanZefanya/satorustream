import type { AnimeItem } from '../types/anime'

const WATCH_HISTORY_KEY = 'satorustream-watch-history-v1'
const ANIME_META_KEY = 'satorustream-anime-meta-v1'
const RECOMMENDATION_KEY = 'satorustream-recommendations-v1'

const HISTORY_LIMIT = 12
const RECOMMENDATION_LIMIT = 24

type AnimeMeta = {
  slug: string
  title?: string
  poster?: string
  updatedAt: number
}

export type WatchHistoryEntry = {
  animeSlug?: string
  episodeSlug?: string
  episodeLabel?: string
  title?: string
  poster?: string
  watchedAt: number
}

type RecommendationShelf = {
  sourceTitle?: string
  sourceSlug?: string
  updatedAt: number
  items: Pick<AnimeItem, 'slug' | 'title' | 'poster'>[]
}

const readJson = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures.
  }
}

export const saveAnimeMeta = (anime: Pick<AnimeItem, 'slug' | 'title' | 'poster'>) => {
  if (!anime.slug) {
    return
  }

  const metaMap = readJson<Record<string, AnimeMeta>>(ANIME_META_KEY) ?? {}
  metaMap[anime.slug] = {
    slug: anime.slug,
    title: anime.title,
    poster: anime.poster,
    updatedAt: Date.now(),
  }

  writeJson(ANIME_META_KEY, metaMap)
}

export const getAnimeMeta = (slug?: string): AnimeMeta | null => {
  if (!slug) {
    return null
  }

  const metaMap = readJson<Record<string, AnimeMeta>>(ANIME_META_KEY)
  return metaMap?.[slug] ?? null
}

export const recordWatchHistory = (entry: Omit<WatchHistoryEntry, 'watchedAt'>) => {
  const current = readJson<WatchHistoryEntry[]>(WATCH_HISTORY_KEY) ?? []
  const watchedAt = Date.now()
  const animeSlug = entry.animeSlug
  const episodeSlug = entry.episodeSlug

  const filtered = current.filter((item) => {
    if (animeSlug && item.animeSlug) {
      return item.animeSlug !== animeSlug
    }

    if (episodeSlug && item.episodeSlug) {
      return item.episodeSlug !== episodeSlug
    }

    return true
  })

  const next: WatchHistoryEntry = {
    ...entry,
    watchedAt,
  }

  filtered.unshift(next)
  writeJson(WATCH_HISTORY_KEY, filtered.slice(0, HISTORY_LIMIT))
}

export const getWatchHistory = (): WatchHistoryEntry[] => {
  const current = readJson<WatchHistoryEntry[]>(WATCH_HISTORY_KEY) ?? []
  return [...current].sort((a, b) => b.watchedAt - a.watchedAt)
}

export const recordRecommendations = (
  source: Pick<AnimeItem, 'slug' | 'title'>,
  items: AnimeItem[],
) => {
  const normalized = items
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      poster: item.poster,
    }))
    .filter((item) => item.slug || item.title)

  if (normalized.length === 0) {
    return
  }

  const deduped: RecommendationShelf['items'] = []
  const seen = new Set<string>()

  normalized.forEach((item) => {
    const key = item.slug ?? item.title ?? ''
    if (!key || seen.has(key)) {
      return
    }

    seen.add(key)
    deduped.push(item)
  })

  const shelf: RecommendationShelf = {
    sourceTitle: source.title,
    sourceSlug: source.slug,
    updatedAt: Date.now(),
    items: deduped.slice(0, RECOMMENDATION_LIMIT),
  }

  writeJson(RECOMMENDATION_KEY, shelf)
}

export const getRecommendationShelf = (): RecommendationShelf | null => {
  return readJson<RecommendationShelf>(RECOMMENDATION_KEY)
}
