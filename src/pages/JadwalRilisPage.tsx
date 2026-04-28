import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CardSkeleton } from '../components/Skeletons'
import { useAsyncData } from '../hooks/useAsyncData'
import { getOngoingSchedule } from '../services/api'
import type { AnimeItem } from '../types/anime'

const DAY_ORDER = [
  'senin',
  'selasa',
  'rabu',
  'kamis',
  'jumat',
  'sabtu',
  'minggu',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const getDayRank = (day: string): number => {
  const index = DAY_ORDER.indexOf(day.toLowerCase())
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

const normalizeDayLabel = (day?: string): string => {
  if (!day || !day.trim()) {
    return 'Lainnya'
  }

  return day
}

const JadwalRilisPage = () => {
  const fetchSchedule = useCallback(() => getOngoingSchedule(), [])
  const { data, loading, error, reload } = useAsyncData(fetchSchedule)

  const groupedSchedule = useMemo(() => {
    const source = data ?? []
    const map = new Map<string, AnimeItem[]>()

    source.forEach((anime) => {
      const label = normalizeDayLabel(anime.release_day)
      const current = map.get(label) ?? []
      current.push(anime)
      map.set(label, current)
    })

    return Array.from(map.entries())
      .sort((a, b) => getDayRank(a[0]) - getDayRank(b[0]))
      .map(([day, anime]) => ({
        day,
        anime: anime.sort((x, y) => (x.title ?? '').localeCompare(y.title ?? '')),
      }))
  }, [data])

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title">Jadwal Rilis</h1>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <CardSkeleton count={12} />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Gagal memuat jadwal rilis.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && groupedSchedule.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Jadwal belum tersedia.
        </div>
      )}

      {!loading && !error && groupedSchedule.length > 0 && (
        <div className="space-y-4">
          {groupedSchedule.map((group) => (
            <section key={group.day} className="surface-panel p-4 sm:p-5">
              <h2 className="text-base font-extrabold text-slate-900">{group.day}</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.anime.map((anime) => (
                  <Link
                    key={anime.slug ?? anime.title}
                    to={anime.slug ? `/anime/${anime.slug}` : '/'}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
                  >
                    <p className="line-clamp-2 font-semibold">{anime.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{anime.current_episode || 'Episode terbaru'}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export default JadwalRilisPage