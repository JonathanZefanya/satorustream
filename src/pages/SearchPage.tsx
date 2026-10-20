import { useCallback, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import AnimeCard from '../components/AnimeCard'
import ErrorState from '../components/ErrorState'
import Pagination from '../components/Pagination'
import { CardSkeleton } from '../components/Skeletons'
import { useAsyncData } from '../hooks/useAsyncData'
import { useSeo } from '../hooks/useSeo'
import { advancedSearch, parseSearchQuery } from '../services/advancedSearch'

const PAGE_SIZE = 24

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q')?.trim() ?? ''
  const parsed = useMemo(() => parseSearchQuery(query), [query])
  const requestedPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)

  useSeo({
    title: query ? `Hasil pencarian "${query}"` : 'Cari Anime Sub Indo',
    description: query
      ? `Hasil pencarian anime "${query}" subtitle Indonesia di SatoruStream.`
      : 'Cari judul anime subtitle Indonesia dan langsung tonton episodenya di SatoruStream.',
    // Halaman hasil pencarian internal sengaja tidak diindeks: isinya berubah
    // terus dan Google menganggapnya konten berkualitas rendah.
    canonicalPath: '/search',
    noIndex: Boolean(query),
  })

  const fetchSearchResult = useCallback(() => advancedSearch(parsed), [parsed])
  const { data: result, loading, error, failure, reload } = useAsyncData(fetchSearchResult, {
    enabled: Boolean(parsed.title || parsed.genres.length),
    initialData: { items: [], genres: [], unknownGenres: [] },
  })
  const items = result?.items ?? []
  const unknownGenres = result?.unknownGenres ?? []

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pagedResults = items.slice(pageStart, pageStart + PAGE_SIZE)

  const changePage = (page: number) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      if (page > 1) next.set('page', String(page))
      else next.delete('page')
      return next
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!query) {
    return (
      <div className="container-app py-8">
        <div className="surface-panel p-6 text-sm text-slate-600">
          Ketik judul anime di kolom pencarian, atau pakai <code className="font-semibold">genre:</code> dan{' '}
          <code className="font-semibold">title:</code> untuk menyaring.
        </div>
      </div>
    )
  }

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="section-title">Hasil pencarian</h1>
          {!loading && !error && items.length > 0 && (
            <p className="mt-1 pl-3.5 text-xs text-slate-500">{items.length} judul ditemukan</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60 dark:hover:border-rose-500/50 dark:hover:text-rose-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!loading && unknownGenres.length > 0 && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Genre tidak dikenal di sumber ini: <span className="font-semibold">{unknownGenres.join(', ')}</span>. Lihat
          nama yang tersedia di halaman Genre List.
        </p>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <CardSkeleton count={12} />
        </div>
      )}

      {!loading && error && <ErrorState error={failure} title="Gagal memuat hasil pencarian" onRetry={reload} />}

      {!loading && !error && items.length === 0 && (
        <div className="surface-panel p-4 text-sm text-slate-600">Tidak ada anime yang cocok dengan pencarian ini.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {pagedResults.map((anime) => (
              <AnimeCard key={anime.slug ?? anime.title} anime={anime} />
            ))}
          </div>
          {pageCount > 1 && (
            <Pagination
              pagination={{
                current_page: currentPage,
                last_visible_page: pageCount,
                has_next_page: currentPage < pageCount,
                next_page: currentPage < pageCount ? currentPage + 1 : null,
                has_previous_page: currentPage > 1,
                previous_page: currentPage > 1 ? currentPage - 1 : null,
              }}
              currentPage={currentPage}
              onChange={changePage}
            />
          )}
        </>
      )}
    </div>
  )
}

export default SearchPage
