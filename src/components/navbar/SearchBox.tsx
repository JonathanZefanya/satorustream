import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadCachedAnimeList } from '../../utils/animeCache'

/** Kolom pencarian header, dengan saran dari cache judul dan pintasan "/". */
const SearchBox = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const currentQuery =
    location.pathname === '/search'
      ? (new URLSearchParams(location.search).get('q') ?? '')
      : ''

  const [query, setQuery] = useState(currentQuery)
  const [isFocused, setIsFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Isi kolom mengikuti kata kunci di URL setiap kali berpindah halaman.
  // Disesuaikan saat render (bukan di effect) supaya tidak render berantai.
  const [syncedQuery, setSyncedQuery] = useState(currentQuery)
  if (syncedQuery !== currentQuery) {
    setSyncedQuery(currentQuery)
    setQuery(currentQuery)
  }

  // Pintasan "/" untuk lompat ke kolom pencarian, diabaikan saat sedang
  // mengetik di input lain.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) {
        return
      }

      event.preventDefault()
      searchInputRef.current?.focus()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const cachedAnime = useMemo(() => loadCachedAnimeList() ?? [], [])
  const suggestionItems = useMemo(() => {
    if (!query || query.trim().length < 2) {
      return []
    }

    const keyword = query.trim().toLowerCase()
    return cachedAnime
      .filter((anime) => (anime.title ?? '').toLowerCase().includes(keyword))
      .slice(0, 6)
  }, [cachedAnime, query])

  const showSuggestions = isFocused && suggestionItems.length > 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const keyword = query.trim()

    if (!keyword) {
      navigate('/')
      return
    }

    navigate(`/search?q=${encodeURIComponent(keyword)}`)
  }

  return (
    <form
      key={`${location.pathname}-${location.search}`}
      onSubmit={handleSubmit}
      className="order-3 min-w-0 flex-1 md:mx-auto md:max-w-lg"
    >
      <div className="relative">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            ref={searchInputRef}
            name="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setIsFocused(false), 120)
            }}
            placeholder="Search anime..."
            aria-label="Cari anime"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-12 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-rose-400/70 dark:focus:ring-rose-900/30"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 lg:block dark:border-slate-700 dark:text-slate-500">
            /
          </kbd>
        </label>

        {showSuggestions && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <ul className="divide-y divide-slate-100 text-sm text-slate-700 dark:divide-slate-800 dark:text-slate-200">
              {suggestionItems.map((anime) => (
                <li key={anime.slug ?? anime.title}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFocused(false)
                      if (anime.slug) {
                        navigate(`/anime/${anime.slug}`)
                        return
                      }

                      setQuery(anime.title ?? query)
                      navigate(`/search?q=${encodeURIComponent(anime.title ?? query)}`)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-rose-50/60 dark:hover:bg-rose-950/30"
                  >
                    <span className="inline-flex h-9 w-7 items-center justify-center rounded-lg bg-rose-100 text-[11px] font-bold text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
                      {anime.title?.charAt(0).toUpperCase() ?? '#'}
                    </span>
                    <span className="flex-1 line-clamp-2 font-medium">
                      {anime.title ?? 'Untitled Anime'}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setIsFocused(false)
                    if (!query.trim()) {
                      return
                    }

                    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50/70 dark:text-rose-300 dark:hover:bg-rose-950/30"
                >
                  Search for "{query.trim()}"
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </form>
  )
}

export default SearchBox
