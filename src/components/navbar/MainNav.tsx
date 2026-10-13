import { Bookmark, CalendarClock, Clapperboard, History, House, Library, Tags } from 'lucide-react'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useSource } from '../../contexts/sourceContext'
import type { SourceCapabilities } from '../../services/sources'

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

const MainNav = () => {
  const { capabilities } = useSource()
  const menuItems = useMemo(() => buildMenuItems(capabilities), [capabilities])

  return (
    <nav className="mt-3 -mx-1 overflow-x-auto no-scrollbar" aria-label="Main navigation">
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
                    ? 'bg-rose-500/10 text-rose-600 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/25'
                    : 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100'
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
  )
}

export default MainNav
