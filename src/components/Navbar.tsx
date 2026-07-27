import {
  Bookmark,
  CalendarClock,
  Clapperboard,
  History,
  House,
  Library,
  LogIn,
  LogOut,
  Moon,
  Search,
  Sun,
  Tags,
  TvMinimalPlay,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContext'
import { useSource } from '../contexts/sourceContext'
import { loadCachedAnimeList } from '../utils/animeCache'
import type { SourceCapabilities } from '../services/sources'

interface NavbarProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

// Menu disaring terhadap kemampuan sumber aktif — Oploverz misalnya tidak
// punya katalog A-Z, jadi menunya tidak ditampilkan sama sekali.
const buildMenuItems = (capabilities: SourceCapabilities) =>
  [
    { label: 'Home', to: '/', icon: House, end: true, enabled: true },
    { label: 'Anime List', to: '/anime-list', icon: Library, end: false, enabled: capabilities.animeList },
    { label: 'Jadwal Rilis', to: '/jadwal-rilis', icon: CalendarClock, end: false, enabled: capabilities.schedule },
    { label: 'OnGoing', to: '/ongoing', icon: Clapperboard, end: false, enabled: capabilities.ongoing },
    { label: 'Genre List', to: '/genres', icon: Tags, end: false, enabled: capabilities.genres },
    { label: 'Wishlist', to: '/wishlist', icon: Bookmark, end: false, enabled: true },
    { label: 'Riwayat', to: '/history', icon: History, end: false, enabled: true },
  ].filter((item) => item.enabled)

const Navbar = ({ theme, onToggleTheme }: NavbarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, enabled: authEnabled, signOut } = useAuth()
  const { sourceId, options, setSourceId, capabilities } = useSource()
  const menuItems = useMemo(() => buildMenuItems(capabilities), [capabilities])
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const accountName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split('@')[0]

  const currentQuery =
    location.pathname === '/search'
      ? (new URLSearchParams(location.search).get('q') ?? '')
      : ''

  useEffect(() => {
    setQuery(currentQuery)
  }, [currentQuery])

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

  const isLightMode = theme === 'light'

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
      <div className="container-app py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <span className="rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 p-2 text-white shadow-sm">
              <TvMinimalPlay className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-tight">SatoruStream</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Your nightly anime orbit
              </p>
            </div>
          </Link>

          {/* Pemilih platform menggantikan badge sumber di posisi yang sama.
              Tersedia untuk tamu maupun pengguna yang sudah masuk; pilihannya
              disimpan per perangkat, dengan VITE_API_SOURCE sebagai nilai awal. */}
          <label className="flex items-center gap-2 sm:order-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Sumber
            </span>
            <select
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              title="Ganti platform sumber anime"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <form
              key={`${location.pathname}-${location.search}`}
              onSubmit={handleSubmit}
              className="relative w-full sm:w-[22rem]"
            >
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  name="q"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsFocused(false), 120)
                  }}
                  placeholder="Search anime..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-rose-400/70 dark:focus:ring-rose-900/30"
                />
              </label>

              {showSuggestions && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
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
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-rose-50/60"
                        >
                          <span className="inline-flex h-9 w-7 items-center justify-center rounded-lg bg-rose-100 text-[11px] font-bold text-rose-600">
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
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50/70"
                      >
                        Search for "{query.trim()}"
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </form>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              title={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {isLightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            {/* Tombol akun hanya muncul kalau Supabase dikonfigurasi. Tanpa itu
                wishlist dan riwayat tetap jalan secara lokal. */}
            {authEnabled &&
              (user ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  title={`Keluar dari ${accountName ?? 'akun'}`}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden max-w-[7rem] truncate sm:inline">{accountName}</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Masuk</span>
                </Link>
              ))}
          </div>
        </div>

        <nav className="mt-3 overflow-x-auto pb-1" aria-label="Main navigation">
          <div className="flex min-w-max items-center gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-rose-800 dark:hover:text-rose-300'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Navbar