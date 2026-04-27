import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import AnimeCard from '../components/AnimeCard'
import { CardSkeleton } from '../components/Skeletons'
import { useAsyncData } from '../hooks/useAsyncData'
import { getAnimeByGenre, getGenres } from '../services/api'

const GenreListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedGenre = searchParams.get('genre') ?? ''

  const {
    data: genres,
    loading: genresLoading,
    error: genresError,
    reload: reloadGenres,
  } = useAsyncData(getGenres)

  useEffect(() => {
    if (genresLoading || selectedGenre || !genres?.length) {
      return
    }

    const params = new URLSearchParams(searchParams)
    params.set('genre', genres[0].slug ?? '')
    setSearchParams(params, { replace: true })
  }, [genres, genresLoading, searchParams, selectedGenre, setSearchParams])

  const fetchAnimeByGenre = useCallback(() => {
    if (!selectedGenre) {
      return Promise.resolve({ items: [], pagination: null })
    }

    return getAnimeByGenre(selectedGenre)
  }, [selectedGenre])

  const {
    data: genreAnime,
    loading: animeLoading,
    error: animeError,
    reload: reloadAnime,
  } = useAsyncData(fetchAnimeByGenre, { enabled: Boolean(selectedGenre) })

  const selectedGenreName = useMemo(() => {
    return genres?.find((genre) => genre.slug === selectedGenre)?.name || '-'
  }, [genres, selectedGenre])

  const handlePickGenre = (slug?: string) => {
    if (!slug) {
      return
    }

    const params = new URLSearchParams(searchParams)
    params.set('genre', slug)
    setSearchParams(params)
  }

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title">Genre List</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void reloadGenres()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
          >
            Refresh Genre
          </button>
          <button
            type="button"
            onClick={() => void reloadAnime()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
          >
            Refresh Anime
          </button>
        </div>
      </div>

      {genresLoading && (
        <div className="mb-6 flex flex-wrap gap-2 animate-pulse">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={`genre-skeleton-${index}`} className="h-8 w-24 rounded-full bg-slate-200" />
          ))}
        </div>
      )}

      {!genresLoading && genresError && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Gagal memuat daftar genre.</p>
          <p className="mt-1">{genresError}</p>
        </div>
      )}

      {!genresLoading && !genresError && (
        <div className="mb-6 flex flex-wrap gap-2">
          {(genres ?? []).map((genre) => (
            <button
              key={genre.slug ?? genre.name}
              type="button"
              onClick={() => handlePickGenre(genre.slug)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedGenre === genre.slug
                  ? 'border-rose-300 bg-rose-50 text-rose-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
      )}

      {!animeLoading && selectedGenre && (
        <p className="mb-4 text-sm font-semibold text-slate-700">Filter aktif: {selectedGenreName}</p>
      )}

      {animeLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <CardSkeleton count={12} />
        </div>
      )}

      {!animeLoading && animeError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Gagal memuat anime berdasarkan genre.</p>
          <p className="mt-1">{animeError}</p>
        </div>
      )}

      {!animeLoading && !animeError && (genreAnime?.items.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Anime untuk genre ini belum tersedia.
        </div>
      )}

      {!animeLoading && !animeError && (genreAnime?.items.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {genreAnime?.items.map((anime) => <AnimeCard key={anime.slug ?? anime.title} anime={anime} />)}
        </div>
      )}
    </div>
  )
}

export default GenreListPage