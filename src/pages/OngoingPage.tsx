import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import AnimeCard from '../components/AnimeCard'
import Pagination from '../components/Pagination'
import { CardSkeleton } from '../components/Skeletons'
import { useSource } from '../contexts/sourceContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { useSeo } from '../hooks/useSeo'
import { getCompletePage, getOngoingPage } from '../services/api'

type TabKey = 'ongoing' | 'completed'

const TAB_COPY: Record<
  TabKey,
  { label: string; heading: string; subtitle: string; empty: string }
> = {
  ongoing: {
    label: 'OnGoing',
    heading: 'OnGoing Anime',
    subtitle: 'Anime yang sedang tayang musim ini.',
    empty: 'Data ongoing belum tersedia.',
  },
  completed: {
    label: 'Complete',
    heading: 'Complete Anime',
    subtitle: 'Anime yang sudah tamat dan lengkap semua episodenya.',
    empty: 'Data anime tamat belum tersedia.',
  },
}

const TAB_KEYS: TabKey[] = ['ongoing', 'completed']

const OngoingPage = () => {
  const { capabilities } = useSource()

  // Tab dan nomor halaman disimpan di URL supaya bisa dibagikan, di-bookmark,
  // dan tombol back browser mengembalikan ke tampilan yang sama.
  const [searchParams, setSearchParams] = useSearchParams()
  const pageParam = Number(searchParams.get('page') ?? '1')
  const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam

  // Tautan lama atau sumber yang baru diganti bisa meminta tab yang tidak
  // didukung — dalam hal itu tampilkan ongoing daripada halaman error.
  const wantsCompleted = searchParams.get('tab') === 'completed'
  const activeTab: TabKey = wantsCompleted && capabilities.completed ? 'completed' : 'ongoing'
  const copy = TAB_COPY[activeTab]
  const isCompleted = activeTab === 'completed'

  const fetchPage = useCallback(
    () => (activeTab === 'completed' ? getCompletePage(currentPage) : getOngoingPage(currentPage)),
    [activeTab, currentPage],
  )
  const { data, loading, error, reload } = useAsyncData(fetchPage)

  const pageSuffix = currentPage > 1 ? ` (Halaman ${currentPage})` : ''
  const canonicalQuery = [isCompleted ? 'tab=completed' : '', currentPage > 1 ? `page=${currentPage}` : '']
    .filter(Boolean)
    .join('&')

  useSeo({
    title: isCompleted
      ? `Anime Complete Sub Indo — Sudah Tamat${pageSuffix}`
      : `Anime Ongoing Sub Indo — Sedang Tayang Musim Ini${pageSuffix}`,
    description: isCompleted
      ? 'Daftar anime yang sudah tamat dengan subtitle Indonesia, lengkap dari episode pertama sampai terakhir.'
      : 'Daftar anime ongoing subtitle Indonesia yang sedang tayang musim ini, lengkap dengan episode terbaru dan update mingguan.',
    canonicalPath: canonicalQuery ? `/ongoing?${canonicalQuery}` : '/ongoing',
    keywords: isCompleted
      ? ['anime complete', 'anime tamat', 'anime selesai sub indo', 'anime end sub indo']
      : ['anime ongoing', 'anime sedang tayang', 'anime musim ini', 'anime ongoing sub indo'],
  })

  const buildParams = (tab: TabKey, page: number) => {
    const params = new URLSearchParams(searchParams)

    if (tab === 'completed') {
      params.set('tab', 'completed')
    } else {
      params.delete('tab')
    }

    // Halaman pertama tidak perlu parameter — biarkan URL-nya bersih.
    if (page <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }

    return params
  }

  const handleChangePage = (page: number) => {
    setSearchParams(buildParams(activeTab, page))
  }

  // Ganti tab selalu kembali ke halaman 1: nomor halaman tab lama tidak ada
  // hubungannya dengan panjang daftar tab yang baru.
  const handleChangeTab = (tab: TabKey) => {
    if (tab !== activeTab) {
      setSearchParams(buildParams(tab, 1))
    }
  }

  const items = data?.items ?? []
  const lastPage = data?.pagination?.last_visible_page

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="section-title">{copy.heading}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {lastPage && lastPage > 1 ? `Halaman ${currentPage} dari ${lastPage}` : copy.subtitle}
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

      {/* Tab hanya berguna kalau sumbernya memang punya daftar completed. */}
      {capabilities.completed && (
        <div
          role="tablist"
          aria-label="Status anime"
          className="mb-5 inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
        >
          {TAB_KEYS.map((tab) => {
            const isActive = tab === activeTab

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleChangeTab(tab)}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                  isActive
                    ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300'
                }`}
              >
                {TAB_COPY[tab].label}
              </button>
            )
          })}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <CardSkeleton count={12} />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Gagal memuat daftar anime.</p>
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
            copy.empty
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
