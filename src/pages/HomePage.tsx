import { useCallback } from 'react'
import AnimeCard from '../components/AnimeCard'
import { CardSkeleton } from '../components/Skeletons'
import { useAsyncData } from '../hooks/useAsyncData'
import { getComplete, getOngoing } from '../services/api'

type HomePayload = {
  ongoing: Awaited<ReturnType<typeof getOngoing>>
  complete: Awaited<ReturnType<typeof getComplete>>
}

const HomePage = () => {
  const fetchHomeData = useCallback(async (): Promise<HomePayload> => {
    const [ongoing, complete] = await Promise.all([getOngoing(), getComplete()])
    return { ongoing, complete }
  }, [])

  const { data, loading, error, reload } = useAsyncData(fetchHomeData)

  return (
    <div className="container-app py-6 sm:py-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="section-title">Ongoing Anime</h1>
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
            <p className="font-semibold">Failed to load anime data.</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {(data?.ongoing ?? []).map((anime) => (
              <AnimeCard key={anime.slug ?? anime.title} anime={anime} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="section-title">Completed Anime</h2>
        {loading ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            <CardSkeleton count={12} />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {(data?.complete ?? []).map((anime) => (
              <AnimeCard key={anime.slug ?? anime.title} anime={anime} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default HomePage