import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Pagination as PaginationInfo } from '../types/anime'

interface PaginationProps {
  pagination: PaginationInfo | null | undefined
  currentPage: number
  onChange: (page: number) => void
  busy?: boolean
}

const buildPageWindow = (current: number, last: number): (number | null)[] => {
  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1)
  }

  const pages = new Set([1, last, current, current - 1, current + 1])
  const visible = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b)

  return visible.flatMap((page, index) => {
    const previous = visible[index - 1]
    return previous !== undefined && page - previous > 1 ? [null, page] : [page]
  })
}

const buttonClass =
  'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition enabled:hover:border-rose-300 enabled:hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:enabled:hover:border-rose-700 dark:enabled:hover:text-rose-300'

/**
 * Navigasi halaman bersama untuk daftar yang datang dari API berhalaman.
 * Tidak menampilkan apa pun kalau sumbernya hanya punya satu halaman.
 */
const Pagination = ({ pagination, currentPage, onChange, busy = false }: PaginationProps) => {
  if (!pagination || pagination.last_visible_page <= 1) {
    return null
  }

  const lastPage = pagination.last_visible_page

  return (
    <nav
      aria-label="Navigasi halaman"
      className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
    >
      <button
        type="button"
        onClick={() => onChange(pagination.previous_page ?? currentPage - 1)}
        disabled={busy || !pagination.has_previous_page}
        className={buttonClass}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Prev
      </button>

      {buildPageWindow(currentPage, lastPage).map((page, index) =>
        page === null ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="px-1 text-xs font-semibold text-slate-400"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onChange(page)}
            disabled={busy}
            aria-current={page === currentPage ? 'page' : undefined}
            className={
              page === currentPage
                ? 'inline-flex h-9 min-w-9 items-center justify-center rounded bg-rose-600 px-3 text-xs font-bold text-white'
                : buttonClass
            }
          >
            {page}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(pagination.next_page ?? currentPage + 1)}
        disabled={busy || !pagination.has_next_page}
        className={buttonClass}
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </nav>
  )
}

export default Pagination
