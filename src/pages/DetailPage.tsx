import { ChevronRight, Star } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DetailSkeleton } from '../components/Skeletons'
import { useAsyncData } from '../hooks/useAsyncData'
import { getDetail } from '../services/api'
import { recordRecommendations, saveAnimeMeta } from '../utils/watchHistory'

const DetailPage = () => {
  const { endpoint = '' } = useParams()

  const fetchDetail = useCallback(() => getDetail(endpoint), [endpoint])
  const { data: anime, loading, error, reload } = useAsyncData(fetchDetail, {
    enabled: Boolean(endpoint),
  })

  useEffect(() => {
    if (!anime) {
      return
    }

    const animeSlug = endpoint
    saveAnimeMeta({ slug: animeSlug, title: anime.title, poster: anime.poster })
    if (anime.recommendations?.length) {
      recordRecommendations({ slug: animeSlug, title: anime.title }, anime.recommendations)
    }
  }, [anime, endpoint])

  if (loading) {
    return (
      <div className="container-app py-6 sm:py-8">
        <DetailSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-app py-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <p className="text-base font-semibold">Unable to load anime detail.</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-4 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!anime) {
    return (
      <div className="container-app py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Anime detail is not available.
        </div>
      </div>
    )
  }

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="grid gap-6 md:grid-cols-[minmax(220px,280px)_1fr]">
        <div>
          <img
            src={anime.poster || 'https://placehold.co/640x900?text=No+Image'}
            alt={anime.title || 'Anime poster'}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            width={640}
            height={900}
            className="aspect-[3/4] w-full rounded-2xl object-cover shadow-soft"
          />
        </div>

        <div className="surface-panel p-5 sm:p-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{anime.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{anime.japanese_title || 'Japanese title unavailable'}</p>

          <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
            <p>
              <span className="font-semibold text-slate-900">Status:</span> {anime.status || '-'}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Score:</span>{' '}
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-500" />
                {anime.rating || '-'}
              </span>
            </p>
            <p>
              <span className="font-semibold text-slate-900">Studio:</span> {anime.studio || '-'}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Release:</span> {anime.release_date || '-'}
            </p>
          </div>

          <div className="mt-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Genres</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {anime.genres?.length ? (
                anime.genres.map((genre) => (
                  <span
                    key={genre.slug ?? genre.name}
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600"
                  >
                    {genre.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No genres listed.</span>
              )}
            </div>
          </div>

          <div className="mt-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Synopsis</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">{anime.synopsis || 'Synopsis unavailable.'}</p>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Episodes</h2>
            <div className="mt-2 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {anime.episode_lists?.length ? (
                anime.episode_lists.map((episode) => (
                  <Link
                    key={episode.slug ?? episode.episode}
                    to={`/watch/${episode.slug}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
                  >
                    <span>{episode.episode}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ))
              ) : (
                <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  Episode list unavailable.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailPage