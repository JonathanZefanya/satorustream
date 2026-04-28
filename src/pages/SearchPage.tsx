import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AnimeCard from '../components/AnimeCard'
import { CardSkeleton } from '../components/Skeletons'
import { useAsyncData } from '../hooks/useAsyncData'
import { searchAnime } from '../services/api'

const SearchPage = () => {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q')?.trim() ?? ''
  const [statusFilter, setStatusFilter] = useState('all')
  const [seasonFilter, setSeasonFilter] = useState('all')

  const fetchSearchResult = useCallback(() => searchAnime(query), [query])
  const { data, loading, error, reload } = useAsyncData(fetchSearchResult, {
    enabled: Boolean(query),
    initialData: [],
  })

  useEffect(() => {
    setStatusFilter('all')
    setSeasonFilter('all')
  }, [query])

  const statusOptions = useMemo(() => {
    const options = new Set<string>()
    ;(data ?? []).forEach((item) => {
      if (item.status) {
        options.add(item.status)
      }
    })
    return ['all', ...Array.from(options)]
  }, [data])

  const seasonOptions = useMemo(() => {
    const options = new Set<string>()
    ;(data ?? []).forEach((item) => {
      if (item.season) {
        options.add(item.season)
      }
    })
    return ['all', ...Array.from(options)]
  }, [data])

  const filteredResults = useMemo(() => {
    let items = data ?? []

    if (statusFilter !== 'all') {
      const normalized = statusFilter.toLowerCase()
      items = items.filter((item) => (item.status ?? '').toLowerCase() === normalized)
    }

    if (seasonFilter !== 'all') {
      const normalized = seasonFilter.toLowerCase()
      items = items.filter((item) => (item.season ?? '').toLowerCase() === normalized)
    }

    return items
  }, [data, seasonFilter, statusFilter])

  if (!query) {
    return (
      <div className="container-app py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Start searching from the input above to discover anime titles.
        </div>
      </div>
    )
  }

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="section-title">Search: {query}</h1>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
        >
          Retry
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <CardSkeleton count={12} />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Failed to fetch search results.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && (data?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          No result found for this keyword.
        </div>
      )}

      {!loading && !error && (data?.length ?? 0) > 0 && (
        <>
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Filters</span>
              {statusOptions.map((option) => (
                <button
                  key={`status-${option}`}
                  type="button"
                  onClick={() => setStatusFilter(option)}
                  className={`rounded-full border px-3 py-1 transition ${
                    statusFilter === option
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
                  }`}
                >
                  {option === 'all' ? 'All Status' : option}
                </button>
              ))}
              {seasonOptions.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {seasonOptions.map((option) => (
                    <button
                      key={`season-${option}`}
                      type="button"
                      onClick={() => setSeasonFilter(option)}
                      className={`rounded-full border px-3 py-1 transition ${
                        seasonFilter === option
                          ? 'border-rose-300 bg-rose-50 text-rose-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
                      }`}
                    >
                      {option === 'all' ? 'All Seasons' : option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Showing {filteredResults.length} of {data?.length ?? 0} titles.
            </p>
          </div>

          {filteredResults.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Tidak ada hasil sesuai filter yang dipilih.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredResults.map((anime) => (
                <AnimeCard key={anime.slug ?? anime.title} anime={anime} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SearchPage