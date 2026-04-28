import { Link } from 'react-router-dom'
import type { WatchHistoryEntry } from '../utils/watchHistory'

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
      to={`/watch/${entry.episodeSlug}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-rose-200"
    >
      <div className="flex gap-3">
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
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
          <p className="text-sm font-semibold text-slate-900 line-clamp-2">{title}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{episodeLabel}</p>
          <span className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition group-hover:border-rose-200 group-hover:text-rose-600">
            Continue watching
          </span>
        </div>
      </div>
    </Link>
  )
}

export default ContinueWatchingCard
