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
      <div className="relative overflow-hidden rounded-xl aspect-[3/4]">
        <img
          src={anime.poster || 'https://placehold.co/480x640?text=No+Image'}
          alt={anime.title || 'Anime poster'}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          width={480}
          height={640}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 rounded-md bg-slate-900/85 px-2 py-1 text-[11px] font-semibold text-white">
          {badgeText}
        </span>
      </div>
      <h3 className="line-clamp-2 pt-2 text-sm font-semibold leading-5 text-slate-900">{anime.title || 'Untitled Anime'}</h3>
    </>
  )

  if (!anime.slug) {
    return <article className="group">{cardContent}</article>
  }

  return (
    <Link to={`/anime/${anime.slug}`} className="group block" aria-label={anime.title || 'Anime detail'}>
      {cardContent}
    </Link>
  )
}

export default AnimeCard