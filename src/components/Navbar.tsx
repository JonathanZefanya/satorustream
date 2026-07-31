import {
  Bookmark,
  CalendarClock,
  Check,
  ChevronDown,
  Clapperboard,
  History,
  House,
  Layers,
  Library,
  LogIn,
  LogOut,
  Moon,
  Search,
  Sun,
  Tags,
  TvMinimalPlay,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
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

// Tombol ikon di sisi kanan header dibuat seragam supaya tinggi dan radiusnya
// tidak berbeda-beda antar tombol.
const controlClass =
  'inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:border-rose-300 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-rose-500/60 dark:hover:text-rose-300 dark:focus-visible:ring-rose-500/30'

interface SourcePickerProps {
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
}

// Dropdown sumber dibuat sendiri, bukan <select> bawaan, karena panel milik
// sistem operasi tidak bisa diberi gaya dan tampak asing di header gelap.
// Polanya mengikuti "select-only combobox" ARIA: fokus tetap di tombol dan
// pilihan aktif ditunjuk lewat aria-activedescendant.
const SourcePicker = ({ value, options, onChange }: SourcePickerProps) => {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  )
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedLabel = options[selectedIndex]?.label ?? value

  // Klik di luar menutup panel. Listener hanya dipasang saat panel terbuka.
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  // Daftar sumber bisa lebih panjang dari panelnya, jadi baris yang sedang
  // disorot lewat keyboard ikut digulir ke area yang terlihat.
  useEffect(() => {
    if (!isOpen) {
      return
    }

    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, activeIndex])

  const open = () => {
    setActiveIndex(selectedIndex)
    setIsOpen(true)
  }

  const commit = (index: number) => {
    const option = options[index]

    if (option) {
      onChange(option.id)
    }

    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()

        if (!isOpen) {
          open()
          return
        }

        const step = event.key === 'ArrowDown' ? 1 : -1
        setActiveIndex((current) => (current + step + options.length) % options.length)
        return
      }
      case 'Home':
      case 'End': {
        if (!isOpen) {
          return
        }

        event.preventDefault()
        setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
        return
      }
      case 'Enter':
      case ' ': {
        event.preventDefault()

        if (!isOpen) {
          open()
          return
        }

        commit(activeIndex)
        return
      }
      case 'Escape': {
        if (isOpen) {
          event.preventDefault()
          setIsOpen(false)
        }

        return
      }
      case 'Tab': {
        setIsOpen(false)
      }
    }
  }

  return (
    <div ref={containerRef} className="relative order-4 shrink-0 md:order-3">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'source-picker-list' : undefined}
        aria-activedescendant={isOpen ? `source-picker-option-${activeIndex}` : undefined}
        aria-label={`Sumber anime: ${selectedLabel}`}
        title="Ganti platform sumber anime"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        className={`${controlClass} gap-2 pl-3 pr-2.5 ${
          isOpen
            ? 'border-rose-300 text-rose-600 dark:border-rose-500/60 dark:text-rose-300'
            : ''
        }`}
      >
        <Layers className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
        <span className="hidden text-[11px] font-bold uppercase tracking-wide text-slate-400 lg:inline dark:text-slate-500">
          Sumber
        </span>
        <span className="max-w-[5rem] truncate text-xs font-semibold text-slate-700 sm:max-w-[7rem] dark:text-slate-200">
          {selectedLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="pop-in absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-soft dark:border-slate-800 dark:bg-slate-950">
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Pilih sumber
          </p>
          <ul
            ref={listRef}
            id="source-picker-list"
            role="listbox"
            aria-label="Sumber anime"
            className="max-h-72 space-y-0.5 overflow-y-auto"
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex
              const isActive = index === activeIndex

              return (
                <li
                  key={option.id}
                  id={`source-picker-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive}
                  onClick={() => commit(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? 'text-rose-600 dark:text-rose-300'
                      : 'text-slate-600 dark:text-slate-300'
                  } ${isActive ? 'bg-rose-50 dark:bg-rose-950/40' : ''}`}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

const Navbar = ({ theme, onToggleTheme }: NavbarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, enabled: authEnabled, signOut } = useAuth()
  const { sourceId, options, setSourceId, capabilities } = useSource()
  const menuItems = useMemo(() => buildMenuItems(capabilities), [capabilities])
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const accountName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split('@')[0]

  const currentQuery =
    location.pathname === '/search'
      ? (new URLSearchParams(location.search).get('q') ?? '')
      : ''

  useEffect(() => {
    setQuery(currentQuery)
  }, [currentQuery])

  // Header menempel di atas; bayangannya baru muncul setelah halaman digulir
  // supaya saat di puncak tampilannya menyatu dengan latar.
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8)

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  const isLightMode = theme === 'light'

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-white/80 backdrop-blur-xl transition-shadow duration-200 dark:bg-slate-950/80 ${
        isScrolled
          ? 'border-slate-200/80 shadow-soft dark:border-slate-800'
          : 'border-transparent dark:border-transparent'
      }`}
    >
      <div className="container-app py-3">
        {/* Satu baris fleksibel yang diatur lewat `order`. Di layar kecil isinya
            melipat jadi dua baris (identitas + tombol, lalu pencarian + sumber),
            sedangkan di layar lebar semuanya sejajar dalam satu baris. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
          <Link
            to="/"
            className="order-1 mr-auto flex shrink-0 items-center gap-2.5 text-slate-900 md:mr-0 dark:text-slate-100"
          >
            <span className="rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 p-2 text-white shadow-sm">
              <TvMinimalPlay className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="whitespace-nowrap text-lg font-extrabold tracking-tight">
                SatoruStream
              </span>
              <span className="hidden whitespace-nowrap text-[11px] font-medium text-slate-500 sm:block dark:text-slate-400">
                Your nightly anime orbit
              </span>
            </span>
          </Link>

          {/* Pemaksa pindah baris di layar kecil supaya pencarian selalu mulai
              dari baris baru, bukan berdesakan dengan identitas situs. */}
          <div className="order-2 basis-full md:hidden" aria-hidden="true" />

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
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 pl-10 pr-12 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-rose-400/70 dark:focus:bg-slate-900 dark:focus:ring-rose-900/30"
                />
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 lg:block dark:border-slate-700 dark:text-slate-500">
                  /
                </kbd>
              </label>

              {showSuggestions && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
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

          {/* Pemilih platform. Tersedia untuk tamu maupun pengguna yang sudah
              masuk; pilihannya disimpan per perangkat, dengan VITE_API_SOURCE
              sebagai nilai awal. */}
          <SourcePicker value={sourceId} options={options} onChange={setSourceId} />

          <div className="order-1 flex shrink-0 items-center gap-2 md:order-4">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              title={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              className={`${controlClass} w-10`}
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
                  className={`${controlClass} w-10 gap-1.5 px-0 sm:w-auto sm:px-3`}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden max-w-[7rem] truncate text-xs font-semibold sm:inline">
                    {accountName}
                  </span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 px-3 text-xs font-semibold text-white shadow-sm transition hover:from-orange-400 hover:to-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Masuk</span>
                </Link>
              ))}
          </div>
        </div>

        <nav className="mt-3 -mx-1 edge-fade-x overflow-x-auto no-scrollbar" aria-label="Main navigation">
          <div className="flex min-w-max items-center gap-1.5 px-1">
            {menuItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 dark:focus-visible:ring-rose-500/30 ${
                      isActive
                        ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300'
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
