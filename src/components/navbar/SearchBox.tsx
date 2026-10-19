import { CornerDownLeft, Search, Tag } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSource } from '../../contexts/sourceContext'
import { getCachedGenres, genreToken, normalizeGenre, parseSearchQuery } from '../../services/advancedSearch'
import type { Genre } from '../../types/anime'
import { loadCachedAnimeList } from '../../utils/animeCache'

const GENRE_PREFIX = /^(genre|g):(.*)$/i

const KEYWORDS = [
  { key: 'genre:', aliases: ['genre'], hint: 'Saring berdasarkan genre' },
  { key: 'title:', aliases: ['title', 'tittle', 'judul'], hint: 'Cari berdasarkan judul' },
]

interface AssistItem {
  id: string
  label: string
  hint: string
  replacement: string
  kind: 'keyword' | 'genre'
}

/** Kolom pencarian header, dengan saran judul, saran `genre:`, dan pintasan "/". */
const SearchBox = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { sourceId, capabilities } = useSource()
  const currentQuery =
    location.pathname === '/search'
      ? (new URLSearchParams(location.search).get('q') ?? '')
      : ''

  const [query, setQuery] = useState(currentQuery)
  const [isFocused, setIsFocused] = useState(false)
  const [genreState, setGenreState] = useState<{ sourceId: string; items: Genre[] }>({ sourceId: '', items: [] })
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

  const loadGenres = () => {
    if (!capabilities.genres || genreState.sourceId === sourceId) return
    getCachedGenres()
      .then((items) => setGenreState({ sourceId, items }))
      .catch(() => setGenreState({ sourceId, items: [] }))
  }

  const lastToken = query.split(/\s+/).pop() ?? ''
  const genreMatch = lastToken.match(GENRE_PREFIX)
  const typedGenre = genreMatch ? normalizeGenre(genreMatch[2]) : null

  const genreSuggestions = useMemo(() => {
    if (typedGenre === null) return []
    const genres = genreState.sourceId === sourceId ? genreState.items : []
    const chosen = new Set(parseSearchQuery(query).genres)
    return genres
      .filter((genre) => {
        const name = normalizeGenre(genre.name ?? genre.slug ?? '')
        return name && !chosen.has(name) && name.includes(typedGenre)
      })
      .slice(0, 8)
  }, [genreState, query, sourceId, typedGenre])

  const cachedAnime = useMemo(() => loadCachedAnimeList() ?? [], [])
  const titleKeyword = parseSearchQuery(query).title.toLowerCase()
  const suggestionItems = useMemo(() => {
    if (typedGenre !== null || titleKeyword.length < 2) return []
    return cachedAnime
      .filter((anime) => (anime.title ?? '').toLowerCase().includes(titleKeyword))
      .slice(0, 6)
  }, [cachedAnime, titleKeyword, typedGenre])

  const assistItems = useMemo<AssistItem[]>(() => {
    const word = lastToken.toLowerCase()
    if (!word || word.includes(':')) return []

    const keywords = KEYWORDS.filter(
      (keyword) =>
        (keyword.key !== 'genre:' || capabilities.genres) &&
        word.length >= 2 &&
        keyword.aliases.some((alias) => alias.startsWith(word)),
    ).map((keyword) => ({
      id: keyword.key,
      label: keyword.key,
      hint: keyword.hint,
      replacement: keyword.key,
      kind: 'keyword' as const,
    }))

    const typed = normalizeGenre(word)
    const genres = genreState.sourceId === sourceId ? genreState.items : []
    const chosen = new Set(parseSearchQuery(query).genres)
    const genreItems =
      typed.length < 3
        ? []
        : genres
            .filter((genre) => {
              const name = normalizeGenre(genre.name ?? genre.slug ?? '')
              return name.startsWith(typed) && !chosen.has(name)
            })
            .slice(0, 3)
            .map((genre) => {
              const token = genreToken(genre.name ?? genre.slug ?? '')
              return {
                id: token,
                label: token,
                hint: `Saring genre ${genre.name ?? genre.slug}`,
                replacement: `${token} `,
                kind: 'genre' as const,
              }
            })

    return [...keywords, ...genreItems]
  }, [capabilities.genres, genreState, lastToken, query, sourceId])

  const showGenres = isFocused && genreSuggestions.length > 0
  const showSuggestions =
    isFocused && !showGenres && (assistItems.length > 0 || suggestionItems.length > 0)

  const replaceLastToken = (replacement: string) => {
    const tokens = query.split(/\s+/)
    tokens[tokens.length - 1] = replacement
    setQuery(tokens.join(' '))
    searchInputRef.current?.focus()
  }

  const applyGenre = (genre: Genre) => replaceLastToken(`${genreToken(genre.name ?? genre.slug ?? '')} `)

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Tab' || event.shiftKey) return
    const next = showGenres
      ? `${genreToken(genreSuggestions[0].name ?? genreSuggestions[0].slug ?? '')} `
      : assistItems[0]?.replacement
    if (!next) return
    event.preventDefault()
    replaceLastToken(next)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const keyword = query.trim()

    if (!keyword) {
      navigate('/')
      return
    }

    navigate(`/search?q=${encodeURIComponent(keyword)}`)
  }

  const panelClass =
    'absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'

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
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true)
              loadGenres()
            }}
            onBlur={() => {
              window.setTimeout(() => setIsFocused(false), 120)
            }}
            placeholder="Cari judul, atau genre:comedy title:kaguya"
            aria-label="Cari anime"
            autoComplete="off"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-12 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-rose-400/70 dark:focus:ring-rose-900/30"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 lg:block dark:border-slate-700 dark:text-slate-500">
            /
          </kbd>
        </label>

        {showGenres && (
          <div className={panelClass}>
            <ul className="max-h-72 overflow-y-auto py-1 text-sm text-slate-700 dark:text-slate-200">
              {genreSuggestions.map((genre) => (
                <li key={genre.slug ?? genre.name}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyGenre(genre)}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition hover:bg-rose-50/60 dark:hover:bg-rose-950/30"
                  >
                    <Tag className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                    <span className="flex-1 truncate font-medium">{genre.name ?? genre.slug}</span>
                    <span className="text-[11px] text-slate-400">{genreToken(genre.name ?? genre.slug ?? '')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showSuggestions && (
          <div className={panelClass}>
            {assistItems.length > 0 && (
              <ul className="border-b border-slate-100 py-1 text-sm text-slate-700 dark:text-slate-200">
                {assistItems.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => replaceLastToken(item.replacement)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition hover:bg-rose-50/60 dark:hover:bg-rose-950/30"
                    >
                      {item.kind === 'genre' ? (
                        <Tag className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                      ) : (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                      <code className="font-semibold text-rose-600 dark:text-rose-300">{item.label}</code>
                      <span className="flex-1 truncate text-xs text-slate-500">{item.hint}</span>
                      {index === 0 && (
                        <kbd className="rounded border border-slate-200 px-1.5 text-[10px] font-semibold text-slate-400 dark:border-slate-700">
                          Tab
                        </kbd>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {suggestionItems.length > 0 && (
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
            )}
          </div>
        )}
      </div>
    </form>
  )
}

export default SearchBox
