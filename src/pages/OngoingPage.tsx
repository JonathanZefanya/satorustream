import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import AnimeCard from '../components/AnimeCard'
import Pagination from '../components/Pagination'
import { CardSkeleton } from '../components/Skeletons'
import { useAsyncData } from '../hooks/useAsyncData'
import { useSeo } from '../hooks/useSeo'
import { getOngoingPage } from '../services/api'

const OngoingPage = () => {
  // Nomor halaman disimpan di URL supaya bisa dibagikan, di-bookmark, dan
  // tombol back browser mengembalikan ke halaman yang sama.
  const [searchParams, setSearchParams] = useSearchParams()
  const pageParam = Number(searchParams.get('page') ?? '1')
  const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam

  const fetchOngoing = useCallback(() => getOngoingPage(currentPage), [currentPage])
  const { data, loading, error, reload } = useAsyncData(fetchOngoing)

  useSeo({
    title: `Anime Ongoing Sub Indo — Sedang Tayang Musim Ini${
      currentPage > 1 ? ` (Halaman ${currentPage})` : ''
    }`,
    description:
      'Daftar anime ongoing subtitle Indonesia yang sedang tayang musim ini, lengkap dengan episode terbaru dan update mingguan.',
    canonicalPath: currentPage > 1 ? `/ongoing?page=${currentPage}` : '/ongoing',
    keywords: ['anime ongoing', 'anime sedang tayang', 'anime musim ini', 'anime ongoing sub indo'],
  })

  const handleChangePage = (page: number) => {
    const params = new URLSearchParams(searchParams)

    // Halaman pertama tidak perlu parameter — biarkan URL-nya bersih.
    if (page <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }

    setSearchParams(params)
  }

  const items = data?.items ?? []
  const lastPage = data?.pagination?.last_visible_page

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="section-title">OnGoing Anime</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {lastPage && lastPage > 1
              ? `Halaman ${currentPage} dari ${lastPage}`
              : 'Anime yang sedang tayang musim ini.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {currentPage > 1 ? (
            <>
              <p>Halaman {currentPage} kosong — mungkin daftarnya sudah habis.</p>
              <button
                type="button"
                onClick={() => handleChangePage(1)}
                className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Kembali ke halaman 1
              </button>
            </>
          ) : (
            'Data ongoing belum tersedia.'
          )}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((anime) => (
              <AnimeCard key={anime.slug ?? anime.title} anime={anime} />
            ))}
          </div>

          <Pagination
            pagination={data?.pagination}
            currentPage={currentPage}
            onChange={handleChangePage}
          />
        </>
      )}
    </div>
  )
}

export default OngoingPage
