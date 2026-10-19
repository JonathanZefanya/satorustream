import type { AnimeItem, Genre } from '../types/anime'
import { getActiveSourceId, getAnimeByGenre, getCapabilities, getDetail, getGenres, searchAnime } from './api'
import { normalizeGenre, type ParsedQuery } from '../utils/searchQuery'

export { buildSearchQuery, genreToken, normalizeGenre, parseSearchQuery, type ParsedQuery } from '../utils/searchQuery'

const GENRE_PAGES = 3
const DETAIL_LOOKUP_LIMIT = 30
const DETAIL_CONCURRENCY = 4

const genreCache = new Map<string, Promise<Genre[]>>()

export const getCachedGenres = (): Promise<Genre[]> => {
  const sourceId = getActiveSourceId()
  const cached = genreCache.get(sourceId)
  if (cached) return cached

  const request = getGenres().catch((error) => {
    genreCache.delete(sourceId)
    throw error
  })
  genreCache.set(sourceId, request)
  return request
}

const genreKeys = (genre: Genre): string[] =>
  [genre.name, genre.slug].filter((value): value is string => Boolean(value)).map(normalizeGenre)

const resolveGenres = (wanted: string[], available: Genre[]) => {
  const resolved: Genre[] = []
  const unknown: string[] = []

  for (const name of wanted) {
    const match =
      available.find((genre) => genreKeys(genre).includes(name)) ??
      available.find((genre) => genreKeys(genre).some((key) => key.startsWith(name)))
    if (match) resolved.push(match)
    else unknown.push(name)
  }

  return { resolved, unknown }
}

const animeKey = (anime: AnimeItem): string => anime.slug || anime.title || ''

const hasAllGenres = (genres: Genre[] | undefined, required: Genre[]): boolean => {
  const owned = new Set((genres ?? []).flatMap(genreKeys))
  return required.every((genre) => genreKeys(genre).some((key) => owned.has(key)))
}

const mapLimited = async <T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length)
  let cursor = 0

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await task(items[index])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

const filterByGenres = async (items: AnimeItem[], required: Genre[]): Promise<AnimeItem[]> => {
  const candidates = items.slice(0, DETAIL_LOOKUP_LIMIT)

  const matches = await mapLimited(candidates, DETAIL_CONCURRENCY, async (anime) => {
    if (hasAllGenres(anime.genres, required)) return true
    if (!anime.slug) return false
    try {
      const detail = await getDetail(anime.slug)
      return hasAllGenres(detail.genres, required)
    } catch {
      return false
    }
  })

  return candidates.filter((_, index) => matches[index])
}

const fetchGenreItems = async (genre: Genre): Promise<AnimeItem[]> => {
  const slug = genre.slug ?? ''
  const first = await getAnimeByGenre(slug, 1)
  const lastPage = Math.min(first.pagination?.last_visible_page ?? 1, GENRE_PAGES)
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, lastPage - 1) }, (_, index) =>
      getAnimeByGenre(slug, index + 2)
        .then((page) => page.items)
        .catch(() => [] as AnimeItem[]),
    ),
  )
  return [first.items, ...rest].flat()
}

const intersect = (lists: AnimeItem[][]): AnimeItem[] => {
  const [first = [], ...others] = lists
  const otherKeys = others.map((list) => new Set(list.map(animeKey)))
  const seen = new Set<string>()

  return first.filter((anime) => {
    const key = animeKey(anime)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return otherKeys.every((keys) => keys.has(key))
  })
}

export interface AdvancedSearchResult {
  items: AnimeItem[]
  genres: Genre[]
  unknownGenres: string[]
}

export const advancedSearch = async (parsed: ParsedQuery): Promise<AdvancedSearchResult> => {
  const capabilities = getCapabilities()

  if (parsed.genres.length === 0) {
    return { items: parsed.title ? await searchAnime(parsed.title) : [], genres: [], unknownGenres: [] }
  }

  if (!capabilities.genres) {
    throw new Error('Sumber ini tidak mendukung filter genre.')
  }

  const { resolved, unknown } = resolveGenres(parsed.genres, await getCachedGenres())
  if (resolved.length === 0) {
    return { items: [], genres: [], unknownGenres: unknown }
  }

  if (parsed.title) {
    const results = await searchAnime(parsed.title)
    return { items: await filterByGenres(results, resolved), genres: resolved, unknownGenres: unknown }
  }

  const lists = await Promise.all(resolved.map(fetchGenreItems))
  return { items: intersect(lists), genres: resolved, unknownGenres: unknown }
}
