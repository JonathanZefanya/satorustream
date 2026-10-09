import { Link } from 'react-router-dom'
import type { WatchHistoryEntry } from '../utils/watchHistory'
import { watchPath } from '../utils/routes'

interface ContinueWatchingCardProps {
  entry: WatchHistoryEntry
}

const ContinueWatchingCard = ({ entry }: ContinueWatchingCardProps) => {
  const title = entry.title || 'Untitled Anime'
  const episodeLabel = entry.episodeLabel || 'Episode terbaru'

  if (!entry.episodeSlug) {
    return null
  }

  return (
    <Link
      to={watchPath(entry.episodeSlug)}
      className="group block rounded-lg p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800/60"
    >
      <div className="flex gap-3">
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100 ring-1 ring-black/5 dark:ring-white/5">
          <img
            src={entry.poster || 'https://placehold.co/320x480?text=No+Image'}
            alt={title}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            width={320}
            height={480}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{episodeLabel}</p>
          <span className="mt-3 inline-flex items-center rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-600 transition group-hover:bg-rose-600 group-hover:text-white dark:text-rose-300">
            Continue watching
          </span>
        </div>
      </div>
    </Link>
  )
}

export default ContinueWatchingCard
