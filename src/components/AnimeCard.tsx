import { Link } from 'react-router-dom'
import type { AnimeItem } from '../types/anime'

interface AnimeCardProps {
  anime: AnimeItem
}

const AnimeCard = ({ anime }: AnimeCardProps) => {
  const badgeText =
    anime.current_episode ?? anime.status ?? (anime.episode_count ? `Ep ${anime.episode_count}` : 'Update')

  const cardContent = (
    <>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-200 ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_32px_-18px_rgba(15,23,42,0.55)] group-hover:ring-rose-500/40 dark:ring-white/5">
        <img
          src={anime.poster || 'https://placehold.co/480x640?text=No+Image'}
          alt={anime.title || 'Anime poster'}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          width={480}
          height={640}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
        <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          {badgeText}
        </span>
      </div>
      <h3 className="line-clamp-2 pt-2.5 text-sm font-semibold leading-5 text-slate-800 transition group-hover:text-rose-600 dark:text-slate-200 dark:group-hover:text-rose-300">{anime.title || 'Untitled Anime'}</h3>
    </>
  )

  if (!anime.slug) {
    return <article className="group">{cardContent}</article>
  }

  return (
    <Link to={`/anime/${anime.slug}`} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--app-bg)]" aria-label={anime.title || 'Anime detail'}>
      {cardContent}
    </Link>
  )
}

export default AnimeCard