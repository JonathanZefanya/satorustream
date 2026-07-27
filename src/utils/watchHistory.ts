import type { AnimeItem } from '../types/anime'
import { readJson, removeKey, scopedKey, writeJson } from './storage'

// Riwayat menyimpan sourceId di tiap entri sehingga aman dalam satu daftar.
// Cache lain diindeks per slug, jadi harus dipisah per sumber.
const WATCH_HISTORY_KEY = 'satorustream-watch-history-v1'
const ANIME_META_KEY = 'satorustream-anime-meta-v1'
const RECOMMENDATION_KEY = 'satorustream-recommendations-v1'

// Cermin lokal dari riwayat akun; beranda hanya menampilkan beberapa teratas.
const HISTORY_LIMIT = 60
const RECOMMENDATION_LIMIT = 24

type AnimeMeta = {
  slug: string
  title?: string
  poster?: string
  genres?: AnimeItem['genres']
  updatedAt: number
}

export type WatchHistoryEntry = {
  /** Sumber asal entri; slug tidak bisa dibandingkan lintas sumber. */
  sourceId?: string
  animeSlug?: string
  episodeSlug?: string
  episodeLabel?: string
  title?: string
  poster?: string
  watchedAt: number
}

export type RecommendationShelf = {
  sourceTitle?: string
  sourceSlug?: string
  sourceGenres?: AnimeItem['genres']
  updatedAt: number
  items: Pick<AnimeItem, 'slug' | 'title' | 'poster' | 'genres'>[]
}

export const saveAnimeMeta = (anime: Pick<AnimeItem, 'slug' | 'title' | 'poster' | 'genres'>) => {
  if (!anime.slug) {
    return
  }

  const metaMap = readJson<Record<string, AnimeMeta>>(scopedKey(ANIME_META_KEY)) ?? {}
  metaMap[anime.slug] = {
    slug: anime.slug,
    title: anime.title,
    poster: anime.poster,
    genres: anime.genres,
    updatedAt: Date.now(),
  }

  writeJson(scopedKey(ANIME_META_KEY), metaMap)
}

export const getAnimeMeta = (slug?: string): AnimeMeta | null => {
  if (!slug) {
    return null
  }

  const metaMap = readJson<Record<string, AnimeMeta>>(scopedKey(ANIME_META_KEY))
  return metaMap?.[slug] ?? null
}

export const recordWatchHistory = (entry: Omit<WatchHistoryEntry, 'watchedAt'>) => {
  const current = readJson<WatchHistoryEntry[]>(WATCH_HISTORY_KEY) ?? []
  const watchedAt = Date.now()
  const animeSlug = entry.animeSlug
  const episodeSlug = entry.episodeSlug

  // Satu anime cukup diwakili episode terakhirnya. Perbandingan hanya berlaku
  // dalam sumber yang sama karena slug bisa bertabrakan antar sumber.
  const filtered = current.filter((item) => {
    const sameSource = (item.sourceId ?? entry.sourceId) === entry.sourceId

    if (!sameSource) {
      return true
    }

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

/**
 * Ganti isi riwayat lokal dengan daftar yang diberikan, setelah dedup per
 * (sumber, episode). Dipakai saat menyelaraskan dengan riwayat dari akun.
 */
export const mergeWatchHistory = (entries: WatchHistoryEntry[]) => {
  const seen = new Set<string>()
  const deduped: WatchHistoryEntry[] = []

  ;[...entries]
    .sort((a, b) => b.watchedAt - a.watchedAt)
    .forEach((entry) => {
      const key = `${entry.sourceId ?? ''}::${entry.episodeSlug ?? entry.animeSlug ?? ''}`

      if (!key.trim() || seen.has(key)) {
        return
      }

      seen.add(key)
      deduped.push(entry)
    })

  writeJson(WATCH_HISTORY_KEY, deduped.slice(0, HISTORY_LIMIT))
}

/**
 * Riwayat terikat akun, jadi cermin lokalnya dibuang saat keluar agar tidak
 * terbawa ke pengguna berikutnya di perangkat yang sama.
 */
export const clearWatchHistory = () => {
  removeKey(WATCH_HISTORY_KEY)
}

export const recordRecommendations = (
  source: Pick<AnimeItem, 'slug' | 'title' | 'genres'>,
  items: AnimeItem[],
) => {
  const normalized = items
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      poster: item.poster,
      genres: item.genres,
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
    sourceGenres: source.genres,
    updatedAt: Date.now(),
    items: deduped.slice(0, RECOMMENDATION_LIMIT),
  }

  writeJson(scopedKey(RECOMMENDATION_KEY), shelf)
}

export const getRecommendationShelf = (): RecommendationShelf | null => {
  return readJson<RecommendationShelf>(scopedKey(RECOMMENDATION_KEY))
}
