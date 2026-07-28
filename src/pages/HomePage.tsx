import { useCallback, useMemo } from 'react'
import AnimeCard from '../components/AnimeCard'
import ContinueWatchingCard from '../components/ContinueWatchingCard'
import { CardSkeleton } from '../components/Skeletons'
import { useAsyncData } from '../hooks/useAsyncData'
import { SITE_URL, useSeo } from '../hooks/useSeo'
import { getAnimeByGenre, getDetail, getHome } from '../services/api'
import type { AnimeDetail, AnimeItem, Genre } from '../types/anime'
import { useAuth } from '../contexts/authContext'
import { getLocalHistoryForActiveSource } from '../services/userLibrary'
import {
  getAnimeMeta,
  getRecommendationShelf,
  getWatchHistory,
  type RecommendationShelf,
} from '../utils/watchHistory'

const RECOMMENDATION_LIMIT = 12
const MAX_RECOMMENDATION_GENRES = 3

type HomeRecommendationShelf = {
  sourceTitle?: string
  items: AnimeItem[]
}

type HomePayload = {
  ongoing: AnimeItem[]
  complete: AnimeItem[]
  recommendations: HomeRecommendationShelf | null
}

const getGenreKey = (genre?: Genre): string => {
  return (genre?.slug || genre?.name || '').trim().toLowerCase()
}

const getGenreKeys = (genres?: Genre[]): Set<string> => {
  return new Set((genres ?? []).map(getGenreKey).filter(Boolean))
}

const mergeGenres = (animeGenres: Genre[] | undefined, sourceGenre: Genre): Genre[] => {
  const seen = new Set<string>()
  const merged: Genre[] = []

  ;[...(animeGenres ?? []), sourceGenre].forEach((genre) => {
    const key = getGenreKey(genre)
    if (!key || seen.has(key)) {
      return
    }

    seen.add(key)
    merged.push(genre)
  })

  return merged
}

const dedupeAnime = (items: AnimeItem[]): AnimeItem[] => {
  const seen = new Set<string>()
  const result: AnimeItem[] = []

  items.forEach((item) => {
    const key = item.slug || item.title || `${item.poster}-${item.otakudesu_url}`
    if (!key || seen.has(key)) {
      return
    }

    seen.add(key)
    result.push(item)
  })

  return result
}

const scoreRecommendation = (
  anime: AnimeItem,
  source: Pick<AnimeDetail, 'title' | 'genres'> & { slug?: string },
): number => {
  const animeKey = (anime.slug || anime.title || '').toLowerCase()
  const sourceKey = (source.slug || source.title || '').toLowerCase()

  if (!animeKey || animeKey === sourceKey) {
    return Number.NEGATIVE_INFINITY
  }

  const sourceGenreKeys = getGenreKeys(source.genres)
  const animeGenreKeys = getGenreKeys(anime.genres)
  const genreMatchCount = [...animeGenreKeys].filter((genre) => sourceGenreKeys.has(genre)).length

  if (sourceGenreKeys.size > 0 && genreMatchCount === 0) {
    return Number.NEGATIVE_INFINITY
  }

  const sourceTitle = (source.title ?? '').toLowerCase()
  const titleTokens = sourceTitle
    .replace(/\b(season|s\d+|part|episode|sub|indo|tv)\b/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3)
  const titleMatchCount = titleTokens.filter((token) => animeKey.includes(token)).length

  return genreMatchCount * 100 + titleMatchCount * 10
}

const getGenreCandidates = async (sourceGenres: Genre[]): Promise<AnimeItem[]> => {
  const genresToFetch = sourceGenres
    .filter((genre) => genre.slug)
    .slice(0, MAX_RECOMMENDATION_GENRES)

  const pages = await Promise.all(
    genresToFetch.map(async (genre) => {
      try {
        const result = await getAnimeByGenre(genre.slug ?? '', 1)
        return result.items.map((anime) => ({
          ...anime,
          genres: mergeGenres(anime.genres, genre),
        }))
      } catch {
        return []
      }
    }),
  )

  return pages.flat()
}

const buildRecommendations = async (
  visibleAnime: AnimeItem[],
  fallbackShelf: RecommendationShelf | null,
): Promise<HomeRecommendationShelf | null> => {
  const latestWatch = getWatchHistory()[0]
  const sourceSlug = latestWatch?.animeSlug ?? fallbackShelf?.sourceSlug

  if (!sourceSlug) {
    return fallbackShelf?.items.length
      ? { sourceTitle: fallbackShelf.sourceTitle, items: fallbackShelf.items }
      : null
  }

  const storedMeta = getAnimeMeta(sourceSlug)
  let source: (Pick<AnimeDetail, 'title' | 'genres'> & { slug?: string }) | null = null

  try {
    const detail = await getDetail(sourceSlug)
    source = {
      slug: sourceSlug,
      title: detail.title,
      genres: detail.genres,
    }
  } catch {
    const fallbackGenres = storedMeta?.genres ?? fallbackShelf?.sourceGenres ?? []
    source = {
      slug: sourceSlug,
      title: storedMeta?.title ?? latestWatch?.title ?? fallbackShelf?.sourceTitle,
      genres: fallbackGenres,
    }
  }

  const genreCandidates = await getGenreCandidates(source.genres ?? [])
  const candidates = dedupeAnime([
    ...genreCandidates,
    ...visibleAnime,
    ...(fallbackShelf?.items ?? []),
  ])

  const items = candidates
    .map((anime) => ({
      anime,
      score: scoreRecommendation(anime, source),
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score || (a.anime.title ?? '').localeCompare(b.anime.title ?? ''))
    .map((entry) => entry.anime)
    .slice(0, RECOMMENDATION_LIMIT)

  if (items.length === 0) {
    return fallbackShelf?.items.length
      ? { sourceTitle: source.title ?? fallbackShelf.sourceTitle, items: fallbackShelf.items }
      : null
  }

  return {
    sourceTitle: source.title,
    items,
  }
}

const HomePage = () => {
  const { user } = useAuth()

  useSeo({
    title: 'Nonton Anime Sub Indo Gratis — Streaming & Update Terbaru',
    description:
      'Nonton anime subtitle Indonesia gratis di SatoruStream. Anime ongoing, episode terbaru, jadwal rilis harian, dan katalog lengkap dengan kualitas 360p hingga 720p.',
    canonicalPath: '/',
    keywords: ['nonton anime', 'anime sub indo', 'streaming anime', 'anime ongoing', 'anime terbaru'],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'SatoruStream',
      description: 'Katalog streaming anime subtitle Indonesia.',
      url: `${SITE_URL}/`,
      inLanguage: 'id-ID',
    },
  })

  const fetchHomeData = useCallback(async (): Promise<HomePayload> => {
    // superanime menyajikan ongoing + completed dalam satu endpoint home.
    const { ongoing, complete } = await getHome()
    const recommendations = await buildRecommendations([...ongoing, ...complete], getRecommendationShelf())
    return { ongoing, complete, recommendations }
  }, [])

  const { data, loading, error, reload } = useAsyncData(fetchHomeData)

  // Riwayat terikat akun, jadi "Lanjutkan tontonan" hanya untuk yang sudah
  // masuk — dan hanya entri dari sumber yang sedang aktif.
  const continueWatching = useMemo(
    () => (user ? getLocalHistoryForActiveSource().slice(0, 6) : []),
    [user],
  )
  const recommendedItems = data?.recommendations?.items ?? []

  return (
    <div className="container-app py-6 sm:py-8">
      {continueWatching.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Continue</p>
              <h2 className="section-title">Lanjutkan tontonan</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {continueWatching.map((entry) => (
              <ContinueWatchingCard
                key={`${entry.episodeSlug ?? entry.animeSlug ?? entry.watchedAt}`}
                entry={entry}
              />
            ))}
          </div>
        </section>
      )}

      {recommendedItems.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                {data?.recommendations?.sourceTitle
                  ? `Because you watched ${data.recommendations.sourceTitle}`
                  : 'Recommendations'}
              </p>
              <h2 className="section-title">Rekomendasi buat kamu</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {recommendedItems.map((anime) => (
              <AnimeCard key={anime.slug ?? anime.title} anime={anime} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="section-title">Ongoing Anime</h1>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
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
            <p className="font-semibold">Failed to load anime data.</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {(data?.ongoing ?? []).map((anime) => (
              <AnimeCard key={anime.slug ?? anime.title} anime={anime} />
            ))}
          </div>
        )}
      </section>

      {/* Tidak semua sumber menyediakan daftar selesai — sembunyikan kalau kosong. */}
      {(loading || (data?.complete.length ?? 0) > 0) && (
        <section className="mt-10">
          <h2 className="section-title">Completed Anime</h2>
          {loading ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              <CardSkeleton count={12} />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {(data?.complete ?? []).map((anime) => (
                <AnimeCard key={anime.slug ?? anime.title} anime={anime} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default HomePage
