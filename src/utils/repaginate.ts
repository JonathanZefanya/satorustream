import type { AnimeItem, PagedItems, Pagination } from '../types/anime'

/** Habis dibagi 2, 3, 4, dan 6 kolom grid, jadi tiap baris selalu penuh. */
export const DISPLAY_PAGE_SIZE = 24

const CACHE_TTL = 5 * 60 * 1000

type SourcePageFetcher = (page: number) => Promise<PagedItems<AnimeItem>>

const cache = new Map<string, { at: number; request: Promise<PagedItems<AnimeItem>> }>()

const cachedPage = (key: string, page: number, fetcher: SourcePageFetcher) => {
  const cacheKey = `${key}|${page}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.request

  const request = fetcher(page).catch((error) => {
    cache.delete(cacheKey)
    throw error
  })
  cache.set(cacheKey, { at: Date.now(), request })
  return request
}

const itemKey = (anime: AnimeItem) => anime.slug || anime.title || ''

const dedupe = (items: AnimeItem[]) => {
  const seen = new Set<string>()
  return items.filter((anime) => {
    const key = itemKey(anime)
    if (!key) return true
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const buildPagination = (current: number, last: number): Pagination => ({
  current_page: current,
  last_visible_page: last,
  has_next_page: current < last,
  next_page: current < last ? current + 1 : null,
  has_previous_page: current > 1,
  previous_page: current > 1 ? current - 1 : null,
})

/**
 * Menyusun ulang halaman sumber (yang ukurannya berbeda-beda per situs) menjadi
 * halaman tampilan berisi tepat `pageSize` item. Kekurangan diambil dari halaman
 * sumber berikutnya, jadi baris terakhir grid tidak menggantung.
 */
export const getDisplayPage = async (
  key: string,
  fetcher: SourcePageFetcher,
  displayPage: number,
  pageSize = DISPLAY_PAGE_SIZE,
): Promise<PagedItems<AnimeItem>> => {
  const first = await cachedPage(key, 1, fetcher)
  const sourceSize = Math.max(1, first.items.length)
  const sourceLast = Math.max(1, first.pagination?.last_visible_page ?? (first.pagination?.has_next_page ? 2 : 1))

  const start = (displayPage - 1) * pageSize
  const firstNeeded = Math.min(sourceLast, Math.floor(start / sourceSize) + 1)
  let lastNeeded = Math.min(sourceLast, Math.ceil((start + pageSize) / sourceSize))

  const pages = await Promise.all(
    Array.from({ length: lastNeeded - firstNeeded + 1 }, (_, index) =>
      cachedPage(key, firstNeeded + index, fetcher),
    ),
  )

  const offset = start - (firstNeeded - 1) * sourceSize
  let pool = dedupe(pages.flatMap((page) => page.items))

  while (pool.length - offset < pageSize && lastNeeded < sourceLast) {
    lastNeeded += 1
    const next = await cachedPage(key, lastNeeded, fetcher)
    pages.push(next)
    pool = dedupe([...pool, ...next.items])
  }

  const items = pool.slice(Math.max(0, offset), Math.max(0, offset) + pageSize)

  const reachedEnd = lastNeeded >= sourceLast
  const totalItems = reachedEnd
    ? (firstNeeded - 1) * sourceSize + pool.length
    : (sourceLast - 1) * sourceSize + 1
  const displayLast = Math.max(displayPage + (reachedEnd ? 0 : 1), Math.ceil(totalItems / pageSize))

  return {
    items,
    pagination: buildPagination(displayPage, items.length < pageSize ? displayPage : displayLast),
  }
}
