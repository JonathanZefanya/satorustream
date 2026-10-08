import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAsyncData } from '../hooks/useAsyncData'
import { useSeo } from '../hooks/useSeo'
import { getGenres } from '../services/api'
import { genrePath } from '../utils/routes'

const GenreListPage = () => {
  const [searchParams] = useSearchParams()
  const legacyGenre = searchParams.get('genre')

  useSeo({
    title: 'Genre Anime — Jelajahi Berdasarkan Kategori',
    description:
      'Jelajahi anime berdasarkan genre: action, romance, isekai, comedy, dan lainnya. Semua dengan subtitle Indonesia.',
    canonicalPath: '/genres',
    keywords: ['genre anime', 'anime berdasarkan genre'],
  })

  const { data: genres, loading, error, reload } = useAsyncData(getGenres)

  // Tautan lama `/genres?genre=x&page=n` dialihkan ke halaman genre tersendiri.
  if (legacyGenre) {
    const page = searchParams.get('page')
    return <Navigate to={genrePath(legacyGenre, Number(page) || 1)} replace />
  }

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title">Genre List</h1>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-2 animate-pulse sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={`genre-skeleton-${index}`} className="h-9 rounded-md bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Gagal memuat daftar genre.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {(genres ?? [])
            .filter((genre) => genre.slug)
            .map((genre) => (
              <Link
                key={genre.slug}
                to={genrePath(genre.slug ?? '')}
                state={{ genreName: genre.name }}
                title={genre.name}
                className="truncate rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
              >
                {genre.name}
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}

export default GenreListPage
