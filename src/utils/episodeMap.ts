import { readJson, scopedKey, writeJson } from './storage'

/**
 * Sebagian sumber tidak mengembalikan induk anime pada endpoint episode.
 * Pemetaan episode slug -> anime slug dicatat lokal saat halaman detail dibuka,
 * lalu dipakai kembali oleh halaman tonton untuk tombol "Back to Anime".
 *
 * Dipisah per sumber karena slug tidak berlaku lintas platform.
 */
const EPISODE_MAP_KEY = 'satorustream-episode-anime-map-v1'
const MAP_LIMIT = 4000

type EpisodeMap = Record<string, string>

const readMap = (): EpisodeMap => readJson<EpisodeMap>(scopedKey(EPISODE_MAP_KEY)) ?? {}

const writeMap = (map: EpisodeMap) => {
  const entries = Object.entries(map)
  // Buang entri terlama kalau sudah melewati batas agar kuota localStorage aman.
  const trimmed = entries.length > MAP_LIMIT ? entries.slice(entries.length - MAP_LIMIT) : entries
  writeJson(scopedKey(EPISODE_MAP_KEY), Object.fromEntries(trimmed))
}

export const rememberEpisodeAnime = (
  animeSlug: string | undefined,
  episodeSlugs: (string | undefined)[],
) => {
  if (!animeSlug) {
    return
  }

  const slugs = episodeSlugs.filter((slug): slug is string => Boolean(slug))

  if (slugs.length === 0) {
    return
  }

  const map = readMap()
  let changed = false

  slugs.forEach((slug) => {
    if (map[slug] !== animeSlug) {
      map[slug] = animeSlug
      changed = true
    }
  })

  if (changed) {
    writeMap(map)
  }
}

export const lookupAnimeSlug = (episodeSlug?: string): string | undefined => {
  if (!episodeSlug) {
    return undefined
  }

  return readMap()[episodeSlug]
}
