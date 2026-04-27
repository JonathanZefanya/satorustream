import { useCallback } from 'react'
import AnimeCard from '../components/AnimeCard'
import { CardSkeleton } from '../components/Skeletons'
import { useAsyncData } from '../hooks/useAsyncData'
import { getOngoing } from '../services/api'

const OngoingPage = () => {
  const fetchOngoing = useCallback(() => getOngoing(), [])
  const { data, loading, error, reload } = useAsyncData(fetchOngoing)

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title">OnGoing Anime</h1>
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
          <p className="font-semibold">Gagal memuat anime ongoing.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && (data?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Data ongoing belum tersedia.
        </div>
      )}

      {!loading && !error && (data?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data?.map((anime) => <AnimeCard key={anime.slug ?? anime.title} anime={anime} />)}
        </div>
      )}
    </div>
  )
}

export default OngoingPage