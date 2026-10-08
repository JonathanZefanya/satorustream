import { useCallback, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAsyncData } from '../hooks/useAsyncData'
import { useSeo } from '../hooks/useSeo'
import { getAnimeListPage } from '../services/api'
import { readJson, scopedKey, writeJson } from '../utils/storage'
import Pagination from '../components/Pagination'

const LETTERS = ['#', ...Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index))]
const DEFAULT_LETTER = '#'
const LAST_LETTER_KEY = 'anime-list-letter-v1'

const AnimeListPage = () => {
  // Huruf aktif disimpan di URL supaya refresh dan tombol back membuka huruf
  // yang sama; localStorage dipakai saat halaman dibuka tanpa parameter.
  const [searchParams, setSearchParams] = useSearchParams()
  const letterParam = searchParams.get('letter')?.toUpperCase()
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
  const storedLetter = useMemo(() => readJson<string>(scopedKey(LAST_LETTER_KEY)), [])
  const selectedLetter =
    letterParam && LETTERS.includes(letterParam)
      ? letterParam
      : storedLetter && LETTERS.includes(storedLetter)
        ? storedLetter
        : DEFAULT_LETTER

  const selectLetter = useCallback(
    (letter: string) => {
      writeJson(scopedKey(LAST_LETTER_KEY), letter)
      setSearchParams({ letter, page: '1' }, { replace: true })
    },
    [setSearchParams],
  )

  // Huruf hasil pemulihan dari localStorage disalin ke URL supaya alamatnya
  // tetap bisa dibagikan dan refresh berikutnya tidak bergantung pada storage.
  useEffect(() => {
    if (letterParam !== selectedLetter) {
      setSearchParams({ letter: selectedLetter, page: '1' }, { replace: true })
    }
  }, [letterParam, selectedLetter, setSearchParams])

  useSeo({
    title: 'Daftar Anime A-Z — Katalog Lengkap Sub Indo',
    description:
      'Katalog lengkap anime subtitle Indonesia yang diurutkan A sampai Z. Telusuri ribuan judul anime ongoing maupun tamat, lalu tonton langsung di SatoruStream.',
    canonicalPath: '/anime-list',
    keywords: ['daftar anime', 'anime a-z', 'katalog anime', 'list anime sub indo'],
  })

  const fetchAnimePage = useCallback(
    () => getAnimeListPage(selectedLetter, currentPage),
    [currentPage, selectedLetter],
  )
  const { data: pageData, loading, error, reload } = useAsyncData(fetchAnimePage)
  const visibleAnime = pageData?.items ?? []
  const pageCount = pageData?.pagination?.last_visible_page ?? 1

  const changePage = useCallback(
    (page: number) => {
      setSearchParams({ letter: selectedLetter, page: String(page) }, { replace: true })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [selectedLetter, setSearchParams],
  )

  const title = useMemo(() => {
    if (selectedLetter === '#') {
      return 'Anime List: # (Special Characters)'
    }

    return `Anime List: ${selectedLetter}`
  }, [selectedLetter])

  return (
    <div className="container-app py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="section-title">{title}</h1>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
        >
          Refresh
        </button>
      </div>

      <div className="mb-5 overflow-x-auto border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex min-w-max gap-2">
          {LETTERS.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => selectLetter(letter)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                selectedLetter === letter
                  ? 'border-rose-300 bg-rose-50 text-rose-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {loading && !pageData && (
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {Array.from({ length: 18 }, (_, index) => (
            <li key={index} className="border-b border-slate-200 px-1 py-3 dark:border-slate-800">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </li>
          ))}
        </ul>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Gagal memuat anime list.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && visibleAnime.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Tidak ada anime dengan huruf awal {selectedLetter}.
        </div>
      )}

      {!error && visibleAnime.length > 0 && (
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {visibleAnime.map((anime) => {
            const meta = anime.current_episode ?? anime.status ?? (anime.episode_count ? `Ep ${anime.episode_count}` : null)
            const content = (
              <>
                <span className="min-w-0 flex-1 truncate">{anime.title || 'Untitled Anime'}</span>
                {meta && (
                  <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {meta}
                  </span>
                )}
              </>
            )
            const rowClass =
              'flex items-center gap-3 border-b border-slate-200 px-1 py-2.5 text-sm font-medium text-slate-800 dark:border-slate-800 dark:text-slate-200'

            return (
              <li key={`${anime.slug ?? anime.title}-${anime.current_episode ?? anime.episode_count ?? ''}`}>
                {anime.slug ? (
                  <Link
                    to={`/anime/${anime.slug}`}
                    title={anime.title}
                    className={`${rowClass} transition hover:text-rose-600 dark:hover:text-rose-400`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={rowClass}>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!loading && !error && pageCount > 1 && (
        <Pagination
          pagination={{
            current_page: Math.min(currentPage, pageCount),
            last_visible_page: pageCount,
            has_next_page: currentPage < pageCount,
            next_page: currentPage < pageCount ? currentPage + 1 : null,
            has_previous_page: currentPage > 1,
            previous_page: currentPage > 1 ? currentPage - 1 : null,
          }}
          currentPage={Math.min(currentPage, pageCount)}
          onChange={changePage}
          busy={loading}
        />
      )}
    </div>
  )
}

export default AnimeListPage
