import { useCallback, useMemo, useState } from 'react'
import AnimeCard from '../components/AnimeCard'
import { CardSkeleton } from '../components/Skeletons'
import { useAsyncData } from '../hooks/useAsyncData'
import { getCompletePage, getOngoingPage } from '../services/api'
import type { AnimeItem, PagedItems } from '../types/anime'

const LETTERS = ['#', ...Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index))]
const MAX_PAGE_FETCH = 60
const CONCURRENT_PAGE_FETCH = 5
const CACHE_KEY = 'anime-list-cache-v1'
const CACHE_TTL_MS = 5 * 60 * 1000

const getInitialChar = (title?: string): string => {
  const firstChar = title?.trim().charAt(0).toUpperCase() ?? '#'
  return /^[A-Z]$/.test(firstChar) ? firstChar : '#'
}

const dedupeAnime = (items: AnimeItem[]): AnimeItem[] => {
  const seen = new Set<string>()
  const result: AnimeItem[] = []

  items.forEach((item) => {
    const key = item.slug || item.title || `${item.poster}-${item.otakudesu_url}`
    if (!key || seen.has(key)) {
      return
    }

    seen.add(key)
    result.push(item)
  })

  return result
}

const loadCachedAnime = (): AnimeItem[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as { items: AnimeItem[]; savedAt: number }
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

const saveCachedAnime = (items: AnimeItem[]): void => {
  try {
    const payload = JSON.stringify({ items, savedAt: Date.now() })
    localStorage.setItem(CACHE_KEY, payload)
  } catch {
    // Ignore cache write failures.
  }
}

const fetchAllPages = async (
  fetchPage: (page: number) => Promise<PagedItems<AnimeItem>>,
): Promise<AnimeItem[]> => {
  const allItems: AnimeItem[] = []
  const firstPage = await fetchPage(1)
  allItems.push(...firstPage.items)

  const lastPageFromApi = firstPage.pagination?.last_visible_page
  if (!lastPageFromApi || lastPageFromApi <= 1) {
    if (!firstPage.pagination?.has_next_page || !firstPage.pagination.next_page) {
      return allItems
    }

    let page = firstPage.pagination.next_page
    while (page && page <= MAX_PAGE_FETCH) {
      const result = await fetchPage(page)
      allItems.push(...result.items)

      if (!result.pagination?.has_next_page || !result.pagination.next_page) {
        break
      }

      page = result.pagination.next_page
    }

    return allItems
  }

  const lastPage = Math.min(lastPageFromApi, MAX_PAGE_FETCH)
  const pagesToFetch = Array.from({ length: lastPage - 1 }, (_, index) => index + 2)

  for (let index = 0; index < pagesToFetch.length; index += CONCURRENT_PAGE_FETCH) {
    const batch = pagesToFetch.slice(index, index + CONCURRENT_PAGE_FETCH)
    const results = await Promise.all(batch.map((page) => fetchPage(page)))
    results.forEach((result) => allItems.push(...result.items))
  }

  return allItems
}

const AnimeListPage = () => {
  const [selectedLetter, setSelectedLetter] = useState<string>('A')
  const cachedAnime = useMemo(() => loadCachedAnime(), [])

  const fetchAllAnime = useCallback(async () => {
    const [ongoing, complete] = await Promise.all([
      fetchAllPages(getOngoingPage),
      fetchAllPages(getCompletePage),
    ])

    const merged = dedupeAnime([...ongoing, ...complete]).sort((a, b) =>
      (a.title ?? '').localeCompare(b.title ?? ''),
    )

    saveCachedAnime(merged)
    return merged
  }, [])

  const { data, loading, error, reload } = useAsyncData(fetchAllAnime, {
    initialData: cachedAnime ?? undefined,
  })

  const filteredAnime = useMemo(() => {
    return (data ?? []).filter((anime) => getInitialChar(anime.title) === selectedLetter)
  }, [data, selectedLetter])

  const title = useMemo(() => {
    if (selectedLetter === '#') {
      return 'Anime List: # (Special Characters)'
    }

    return `Anime List: ${selectedLetter}`
  }, [selectedLetter])

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title">{title}</h1>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2">
          {LETTERS.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => setSelectedLetter(letter)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                selectedLetter === letter
                  ? 'border-rose-300 bg-rose-50 text-rose-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <CardSkeleton count={12} />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Gagal memuat anime list.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && filteredAnime.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Tidak ada anime dengan huruf awal {selectedLetter}.
        </div>
      )}

      {!error && (filteredAnime.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredAnime.map((anime) => (
            <AnimeCard key={`${anime.slug ?? anime.title}-${anime.current_episode ?? anime.episode_count ?? ''}`} anime={anime} />
          ))}
        </div>
      )}
    </div>
  )
}

export default AnimeListPage