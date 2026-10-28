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

const END_OF_LIST: PagedItems<AnimeItem> = { items: [], pagination: null }

/** Halaman di luar jangkauan dibalas 404 oleh sebagian sumber; anggap itu akhir daftar. */
const pageOrEnd = (key: string, page: number, fetcher: SourcePageFetcher) =>
  cachedPage(key, page, fetcher).catch(() => END_OF_LIST)

/** Sebagian sumber hanya punya tombol Next tanpa total, jadi batas halaman bertambah seiring dimuat. */
const lastPageOf = (page: PagedItems<AnimeItem>, number: number) =>
  Math.max(number, page.pagination?.last_visible_page ?? number, page.pagination?.has_next_page ? number + 1 : number)

const isLastPage = (page: PagedItems<AnimeItem>, number: number) =>
  page.items.length === 0 ||
  (!page.pagination?.has_next_page && (page.pagination?.last_visible_page ?? number) <= number)

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
  let knownLast = lastPageOf(first, 1)

  const start = (displayPage - 1) * pageSize
  const firstNeeded = Math.floor(start / sourceSize) + 1
  let lastNeeded = Math.ceil((start + pageSize) / sourceSize)

  const fetched = await Promise.all(
    Array.from({ length: lastNeeded - firstNeeded + 1 }, (_, index) => {
      const page = firstNeeded + index
      return page === 1 ? first : pageOrEnd(key, page, fetcher)
    }),
  )

  let reachedEnd = false
  let pool: AnimeItem[] = []
  fetched.forEach((page, index) => {
    if (reachedEnd) return
    const number = firstNeeded + index
    pool.push(...page.items)
    knownLast = Math.max(knownLast, lastPageOf(page, number))
    reachedEnd = isLastPage(page, number)
  })
  pool = dedupe(pool)

  const offset = start - (firstNeeded - 1) * sourceSize

  while (pool.length - offset < pageSize && !reachedEnd) {
    lastNeeded += 1
    const next = await pageOrEnd(key, lastNeeded, fetcher)
    pool = dedupe([...pool, ...next.items])
    knownLast = Math.max(knownLast, lastPageOf(next, lastNeeded))
    reachedEnd = isLastPage(next, lastNeeded)
  }

  const items = pool.slice(Math.max(0, offset), Math.max(0, offset) + pageSize)

  const totalItems = reachedEnd
    ? (firstNeeded - 1) * sourceSize + pool.length
    : (knownLast - 1) * sourceSize + 1
  const displayLast = Math.max(displayPage + (reachedEnd ? 0 : 1), Math.ceil(totalItems / pageSize))

  return {
    items,
    pagination: buildPagination(displayPage, items.length < pageSize ? displayPage : displayLast),
  }
}
