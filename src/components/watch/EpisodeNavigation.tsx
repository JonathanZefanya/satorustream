import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type EpisodeNavigationProps = {
  previousSlug?: string
  nextSlug?: string
  animeSlug?: string
}

const activeClass =
  'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600'
const disabledClass =
  'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400'

const EpisodeNavigation = ({ previousSlug, nextSlug, animeSlug }: EpisodeNavigationProps) => {
  const prevContent = (
    <>
      <ChevronLeft className="h-4 w-4" />
      Prev Episode
    </>
  )
  const nextContent = (
    <>
      Next Episode
      <ChevronRight className="h-4 w-4" />
    </>
  )

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {previousSlug ? (
        <Link to={`/watch/${previousSlug}`} className={activeClass}>
          {prevContent}
        </Link>
      ) : (
        <span className={disabledClass}>{prevContent}</span>
      )}

      {animeSlug ? (
        <Link
          to={`/anime/${animeSlug}`}
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
        >
          Back to Anime
        </Link>
      ) : null}

      {nextSlug ? (
        <Link to={`/watch/${nextSlug}`} className={activeClass}>
          {nextContent}
        </Link>
      ) : (
        <span className={disabledClass}>{nextContent}</span>
      )}
    </div>
  )
}

export default EpisodeNavigation
