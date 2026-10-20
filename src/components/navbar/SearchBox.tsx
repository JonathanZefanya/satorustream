import { CornerDownLeft, Search, Tag, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSource } from '../../contexts/sourceContext'
import { getCachedGenres, genreToken, normalizeGenre, parseSearchQuery } from '../../services/advancedSearch'
import type { Genre } from '../../types/anime'
import { loadCachedAnimeList } from '../../utils/animeCache'
import {
  addChip,
  joinQuery,
  splitQuery,
  takeTrailingChip,
  type QueryChip,
} from '../../utils/searchQuery'

const GENRE_PREFIX = /^(genre|g):(.*)$/i

const KEYWORDS = [
  { key: 'genre:', aliases: ['genre'], hint: 'Saring berdasarkan genre' },
  { key: 'title:', aliases: ['title', 'tittle', 'judul'], hint: 'Cari berdasarkan judul' },
]

type AssistItem =
  | { id: string; kind: 'keyword'; label: string; hint: string; prefix: string }
  | { id: string; kind: 'genre'; label: string; hint: string; genre: Genre }

const genreName = (genre: Genre) => genre.name ?? genre.slug ?? ''

/** Kolom pencarian header: kata kunci `genre:`/`title:` tampil sebagai chip di dalam kolom. */
const SearchBox = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { sourceId, capabilities } = useSource()
  const currentQuery =
    location.pathname === '/search'
      ? (new URLSearchParams(location.search).get('q') ?? '')
      : ''

  const [chips, setChips] = useState<QueryChip[]>(() => splitQuery(currentQuery).chips)
  const [text, setText] = useState(() => splitQuery(currentQuery).text)
  const [isFocused, setIsFocused] = useState(false)
  const [genreState, setGenreState] = useState<{ sourceId: string; items: Genre[] }>({ sourceId: '', items: [] })
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Isi kolom mengikuti kata kunci di URL setiap kali berpindah halaman.
  // Disesuaikan saat render (bukan di effect) supaya tidak render berantai.
  const [syncedQuery, setSyncedQuery] = useState(currentQuery)
  if (syncedQuery !== currentQuery) {
    const next = splitQuery(currentQuery)
    setSyncedQuery(currentQuery)
    setChips(next.chips)
    setText(next.text)
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

  const fullQuery = joinQuery(chips, text)
  const lastToken = text.endsWith(' ') ? '' : (text.split(/\s+/).pop() ?? '')
  const genreMatch = lastToken.match(GENRE_PREFIX)
  const typedGenre = genreMatch ? normalizeGenre(genreMatch[2]) : null

  const chosenGenres = useMemo(
    () => new Set(chips.filter((chip) => chip.key === 'genre').map((chip) => chip.value)),
    [chips],
  )
  const availableGenres = genreState.sourceId === sourceId ? genreState.items : null

  const genreSuggestions = useMemo(() => {
    if (typedGenre === null || !availableGenres) return []
    return availableGenres
      .filter((genre) => {
        const name = normalizeGenre(genreName(genre))
        return name && !chosenGenres.has(name) && name.includes(typedGenre)
      })
      .slice(0, 8)
  }, [availableGenres, chosenGenres, typedGenre])

  const cachedAnime = useMemo(() => loadCachedAnimeList() ?? [], [])
  const titleKeyword = useMemo(() => parseSearchQuery(fullQuery).title.toLowerCase(), [fullQuery])
  const suggestionItems = useMemo(() => {
    if (typedGenre !== null || titleKeyword.length < 2) return []
    return cachedAnime
      .filter((anime) => (anime.title ?? '').toLowerCase().includes(titleKeyword))
      .slice(0, 6)
  }, [cachedAnime, titleKeyword, typedGenre])

  const assistItems = useMemo<AssistItem[]>(() => {
    const word = lastToken.toLowerCase()
    if (!word || word.includes(':')) return []

    const keywords: AssistItem[] = KEYWORDS.filter(
      (keyword) =>
        (keyword.key !== 'genre:' || capabilities.genres) &&
        word.length >= 2 &&
        keyword.aliases.some((alias) => alias.startsWith(word)),
    ).map((keyword) => ({
      id: keyword.key,
      kind: 'keyword',
      label: keyword.key,
      hint: keyword.hint,
      prefix: keyword.key,
    }))

    const typed = normalizeGenre(word)
    const genreItems: AssistItem[] =
      typed.length < 3 || !availableGenres
        ? []
        : availableGenres
            .filter((genre) => {
              const name = normalizeGenre(genreName(genre))
              return name.startsWith(typed) && !chosenGenres.has(name)
            })
            .slice(0, 3)
            .map((genre) => ({
              id: genreToken(genreName(genre)),
              kind: 'genre',
              label: genreToken(genreName(genre)),
              hint: `Saring genre ${genreName(genre)}`,
              genre,
            }))

    return [...keywords, ...genreItems]
  }, [availableGenres, capabilities.genres, chosenGenres, lastToken])

  const showGenres = isFocused && genreSuggestions.length > 0
  const showSuggestions =
    isFocused && !showGenres && (assistItems.length > 0 || suggestionItems.length > 0)

  const withoutLastToken = () => {
    const tokens = text.split(/\s+/)
    tokens.pop()
    return tokens.join(' ')
  }

  const focusInput = () => searchInputRef.current?.focus()

  const commitGenre = (genre: Genre) => {
    setChips((current) => addChip(current, { key: 'genre', value: normalizeGenre(genreName(genre)) }))
    setText(withoutLastToken())
    focusInput()
  }

  const insertPrefix = (prefix: string) => {
    setText([withoutLastToken(), prefix].filter(Boolean).join(' '))
    focusInput()
  }

  const applyAssist = (item: AssistItem) => {
    if (item.kind === 'genre') commitGenre(item.genre)
    else insertPrefix(item.prefix)
  }

  const removeChip = (index: number) => {
    setChips((current) => current.filter((_, position) => position !== index))
    focusInput()
  }

  const handleChange = (value: string) => {
    const trailing = takeTrailingChip(value)
    if (trailing) {
      setChips((current) => addChip(current, trailing.chip))
      setText(trailing.rest)
      return
    }
    setText(value)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !text && chips.length > 0) {
      event.preventDefault()
      setChips((current) => current.slice(0, -1))
      return
    }

    if (event.key !== 'Tab' || event.shiftKey) return
    if (showGenres) {
      event.preventDefault()
      commitGenre(genreSuggestions[0])
      return
    }
    if (assistItems[0]) {
      event.preventDefault()
      applyAssist(assistItems[0])
    }
  }

  const submitQuery = (value: string) => {
    setIsFocused(false)
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : '/')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trailing = takeTrailingChip(`${text} `)
    submitQuery(trailing ? joinQuery(addChip(chips, trailing.chip), trailing.rest) : fullQuery)
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
        <div
          onClick={focusInput}
          className="flex h-10 w-full cursor-text items-center gap-1.5 rounded-lg border border-slate-200 bg-white pl-3.5 pr-3 transition focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-rose-400/70 dark:focus-within:ring-rose-900/30"
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pl-1">
            {chips.map((chip, index) => (
              <span
                key={`${chip.key}:${chip.value}`}
                className={`inline-flex shrink-0 items-center gap-1 rounded-md py-0.5 pl-2 pr-1 text-xs font-semibold ${
                  chip.key === 'genre'
                    ? 'bg-rose-500/10 text-rose-600 ring-1 ring-inset ring-rose-500/20 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:ring-slate-700'
                }`}
              >
                <span className="opacity-60">{chip.key}:</span>
                {chip.value}
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation()
                    removeChip(index)
                  }}
                  aria-label={`Hapus ${chip.key} ${chip.value}`}
                  className="rounded p-0.5 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={searchInputRef}
              name="q"
              type="search"
              value={text}
              onChange={(event) => handleChange(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsFocused(true)
                loadGenres()
              }}
              onBlur={() => {
                window.setTimeout(() => setIsFocused(false), 120)
              }}
              placeholder={chips.length ? '' : 'Cari anime'}
              aria-label="Cari anime"
              autoComplete="off"
              className="h-full min-w-[6rem] flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <kbd className="pointer-events-none hidden shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 lg:block dark:border-slate-700 dark:text-slate-500">
            /
          </kbd>
        </div>

        {showGenres && (
          <div className={panelClass}>
            <ul className="max-h-72 overflow-y-auto py-1 text-sm text-slate-700 dark:text-slate-200">
              {genreSuggestions.map((genre, index) => (
                <li key={genre.slug ?? genre.name}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commitGenre(genre)}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition hover:bg-rose-50/60 dark:hover:bg-rose-950/30"
                  >
                    <Tag className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                    <span className="flex-1 truncate font-medium">{genreName(genre)}</span>
                    {index === 0 && (
                      <kbd className="rounded border border-slate-200 px-1.5 text-[10px] font-semibold text-slate-400 dark:border-slate-700">
                        Tab
                      </kbd>
                    )}
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
                      onClick={() => applyAssist(item)}
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
                        submitQuery(anime.title ?? fullQuery)
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
                    onClick={() => submitQuery(fullQuery)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50/70 dark:text-rose-300 dark:hover:bg-rose-950/30"
                  >
                    Search for "{fullQuery}"
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
