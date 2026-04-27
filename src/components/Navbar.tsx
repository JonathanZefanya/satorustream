import {
  CalendarClock,
  Clapperboard,
  House,
  Library,
  Search,
  Tags,
  TvMinimalPlay,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

const menuItems = [
  {
    label: 'Home',
    to: '/',
    icon: House,
    end: true,
  },
  {
    label: 'Anime List',
    to: '/anime-list',
    icon: Library,
    end: false,
  },
  {
    label: 'Jadwal Rilis',
    to: '/jadwal-rilis',
    icon: CalendarClock,
    end: false,
  },
  {
    label: 'OnGoing',
    to: '/ongoing',
    icon: Clapperboard,
    end: false,
  },
  {
    label: 'Genre List',
    to: '/genres',
    icon: Tags,
    end: false,
  },
]

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const currentQuery =
    location.pathname === '/search'
      ? (new URLSearchParams(location.search).get('q') ?? '')
      : ''

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const rawQuery = formData.get('q')
    const keyword = typeof rawQuery === 'string' ? rawQuery.trim() : ''

    if (!keyword) {
      navigate('/')
      return
    }

    navigate(`/search?q=${encodeURIComponent(keyword)}`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="container-app py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-900">
            <span className="rounded-xl bg-rose-100 p-2 text-rose-600">
              <TvMinimalPlay className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-tight">SatoruStream</p>
              <p className="text-xs font-medium text-slate-500">Anime streaming explorer</p>
            </div>
          </Link>

          <form
            key={`${location.pathname}-${location.search}`}
            onSubmit={handleSubmit}
            className="w-full sm:max-w-sm"
          >
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                type="search"
                defaultValue={currentQuery}
                placeholder="Search anime..."
                className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
            </label>
          </form>
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
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
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