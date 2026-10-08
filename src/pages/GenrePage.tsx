import { ChevronLeft } from 'lucide-react'
import { useCallback } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import AnimeCard from '../components/AnimeCard'
import Pagination from '../components/Pagination'
import { CardSkeleton } from '../components/Skeletons'
import { useAsyncData } from '../hooks/useAsyncData'
import { useSeo } from '../hooks/useSeo'
import { getAnimeByGenre } from '../services/api'
import { genrePath } from '../utils/routes'

/** Mengubah slug genre ("slice-of-life") menjadi label judul ("Slice Of Life"). */
const toGenreLabel = (slug: string): string =>
  slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const GenrePage = () => {
  const { genre = '' } = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const pageParam = Number(searchParams.get('page') ?? '1')
  const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam

  // Nama asli dikirim lewat state dari daftar genre; dibuka langsung, slug dipakai.
  const stateName = (location.state as { genreName?: string } | null)?.genreName
  const genreLabel = stateName || toGenreLabel(genre)

  useSeo({
    title: `Anime Genre ${genreLabel} Sub Indo${currentPage > 1 ? ` — Halaman ${currentPage}` : ''}`,
    description: `Kumpulan anime genre ${genreLabel} subtitle Indonesia. Telusuri judul terbaik bergenre ${genreLabel} dan tonton gratis di SatoruStream.`,
    canonicalPath: genrePath(genre, currentPage),
    keywords: [`anime ${genreLabel}`, `anime genre ${genreLabel}`, `${genreLabel} sub indo`],
  })

  const fetchAnime = useCallback(() => getAnimeByGenre(genre, currentPage), [currentPage, genre])
  const { data, loading, error, reload } = useAsyncData(fetchAnime, { enabled: Boolean(genre) })
  const items = data?.items ?? []

  const handleChangePage = (page: number) => {
    const params = new URLSearchParams(searchParams)
    if (page > 1) params.set('page', String(page))
    else params.delete('page')
    setSearchParams(params, { state: location.state })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="container-app py-6 sm:py-8">
      <Link
        to="/genres"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-rose-600"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Semua Genre
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title">Genre: {genreLabel}</h1>
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
          <p className="font-semibold">Gagal memuat anime berdasarkan genre.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Anime untuk genre ini belum tersedia.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((anime) => (
              <AnimeCard key={anime.slug ?? anime.title} anime={anime} />
            ))}
          </div>

          <Pagination pagination={data?.pagination} currentPage={currentPage} onChange={handleChangePage} />
        </>
      )}
    </div>
  )
}

export default GenrePage
