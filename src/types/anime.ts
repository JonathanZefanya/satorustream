export interface Genre {
  name?: string
  slug?: string
  otakudesu_url?: string
}

export interface Pagination {
  current_page: number
  last_visible_page: number
  has_next_page: boolean
  next_page: number | null
  has_previous_page: boolean
  previous_page: number | null
}

export interface PagedItems<T> {
  items: T[]
  pagination: Pagination | null
}

export interface Episode {
  episode?: string
  slug?: string
  otakudesu_url?: string
}

export interface AnimeItem {
  title?: string
  slug?: string
  poster?: string
  status?: string
  rating?: string
  current_episode?: string
  episode_count?: string
  newest_release_date?: string
  last_release_date?: string
  release_day?: string
  season?: string
  studio?: string
  synopsis?: string
  otakudesu_url?: string
  genres?: Genre[]
}

export interface AnimeDetail {
  title?: string
  japanese_title?: string
  poster?: string
  rating?: string
  produser?: string
  type?: string
  status?: string
  episode_count?: string
  duration?: string
  release_date?: string
  studio?: string
  genres: Genre[]
  synopsis?: string
  batch:
    | {
        slug?: string
        otakudesu_url?: string
        uploaded_at?: string
      }
    | null
  episode_lists: Episode[]
  recommendations: AnimeItem[]
}

export interface EpisodeNavigation {
  slug?: string
  otakudesu_url?: string
}

export interface EpisodeDetail {
  episode: string
  anime: {
    slug?: string
    otakudesu_url?: string
  }
  has_next_episode: boolean
  next_episode: EpisodeNavigation | null
  has_previous_episode: boolean
  previous_episode: EpisodeNavigation | null
  iframe_url?: string
  download_urls?: {
    mp4: {
      resolution?: string
      urls: {
        provider?: string
        url?: string
      }[]
    }[]
    mkv: {
      resolution?: string
      urls: {
        provider?: string
        url?: string
      }[]
    }[]
  }
}