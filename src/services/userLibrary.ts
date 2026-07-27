/**
 * Wishlist dan riwayat tontonan — keduanya terikat akun.
 *
 * Tanpa login tidak ada yang disimpan: seluruh operasi menolak dengan
 * `AuthRequiredError`. Yang tersimpan di localStorage hanyalah cermin dari data
 * akun, dipakai supaya "Lanjutkan tontonan" tampil seketika tanpa menunggu
 * jaringan, dan dibuang saat pengguna keluar.
 *
 * Setiap entri membawa `sourceId` karena slug anime berbeda antar sumber:
 * judul yang sama di otakudesu dan oploverz adalah dua entri berbeda.
 */
import { getActiveSourceId } from './sources'
import { requireSupabase } from '../lib/supabase'
import {
  clearWatchHistory,
  getWatchHistory,
  mergeWatchHistory,
  recordWatchHistory,
} from '../utils/watchHistory'
import { readJson, writeJson, removeKey } from '../utils/storage'

const WATCHLIST_MIRROR_KEY = 'satorustream-watchlist-mirror-v1'

export class AuthRequiredError extends Error {
  constructor(action = 'Fitur ini') {
    super(`${action} memerlukan akun. Masuk terlebih dahulu.`)
    this.name = 'AuthRequiredError'
  }
}

export interface WatchlistEntry {
  sourceId: string
  animeSlug: string
  title?: string
  poster?: string
  createdAt: number
}

export interface HistoryEntry {
  sourceId: string
  animeSlug?: string
  episodeSlug: string
  episodeLabel?: string
  title?: string
  poster?: string
  watchedAt: number
}

export const currentSourceId = () => getActiveSourceId()

/* ===== Cermin lokal wishlist ===== */

const readMirror = (): WatchlistEntry[] => readJson<WatchlistEntry[]>(WATCHLIST_MIRROR_KEY) ?? []

const writeMirror = (entries: WatchlistEntry[]) => writeJson(WATCHLIST_MIRROR_KEY, entries)

const isSame = (
  entry: Pick<WatchlistEntry, 'sourceId' | 'animeSlug'>,
  sourceId: string,
  slug: string,
) => entry.sourceId === sourceId && entry.animeSlug === slug

/** Dipanggil saat keluar: buang seluruh jejak data akun di perangkat ini. */
export const clearLocalUserData = () => {
  removeKey(WATCHLIST_MIRROR_KEY)
  clearWatchHistory()
}

/* ===== Wishlist ===== */

export const getWatchlist = async (userId?: string | null): Promise<WatchlistEntry[]> => {
  if (!userId) {
    return []
  }

  const client = requireSupabase()
  const { data, error } = await client
    .from('watchlist')
    .select('source_id, anime_slug, title, poster, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    // Jaringan bermasalah — tampilkan cermin lokal daripada halaman kosong.
    console.warn('[satorustream] gagal memuat wishlist:', error.message)
    return readMirror().sort((a, b) => b.createdAt - a.createdAt)
  }

  const entries: WatchlistEntry[] = (data ?? []).map((row) => ({
    sourceId: row.source_id,
    animeSlug: row.anime_slug,
    title: row.title ?? undefined,
    poster: row.poster ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  }))

  writeMirror(entries)
  return entries
}

export const addToWatchlist = async (
  entry: Omit<WatchlistEntry, 'createdAt' | 'sourceId'> & { sourceId?: string },
  userId?: string | null,
): Promise<void> => {
  if (!userId) {
    throw new AuthRequiredError('Menyimpan ke wishlist')
  }

  const record: WatchlistEntry = {
    sourceId: entry.sourceId ?? currentSourceId(),
    animeSlug: entry.animeSlug,
    title: entry.title,
    poster: entry.poster,
    createdAt: Date.now(),
  }

  const client = requireSupabase()
  const { error } = await client.from('watchlist').upsert(
    {
      user_id: userId,
      source_id: record.sourceId,
      anime_slug: record.animeSlug,
      title: record.title,
      poster: record.poster,
    },
    { onConflict: 'user_id,source_id,anime_slug' },
  )

  if (error) {
    throw new Error(error.message)
  }

  // Cermin baru diperbarui setelah server menerima, supaya tidak pernah
  // menampilkan sesuatu yang sebenarnya gagal tersimpan.
  writeMirror([
    record,
    ...readMirror().filter((item) => !isSame(item, record.sourceId, record.animeSlug)),
  ])
}

export const removeFromWatchlist = async (
  animeSlug: string,
  userId?: string | null,
  sourceId = currentSourceId(),
): Promise<void> => {
  if (!userId) {
    throw new AuthRequiredError('Mengubah wishlist')
  }

  const client = requireSupabase()
  const { error } = await client
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('source_id', sourceId)
    .eq('anime_slug', animeSlug)

  if (error) {
    throw new Error(error.message)
  }

  writeMirror(readMirror().filter((item) => !isSame(item, sourceId, animeSlug)))
}

/** Cek cepat dari cermin lokal — dipakai tombol wishlist saat render awal. */
export const isInWatchlistLocally = (animeSlug: string, sourceId = currentSourceId()): boolean =>
  readMirror().some((item) => isSame(item, sourceId, animeSlug))

/* ===== Riwayat tontonan ===== */

export const recordHistory = async (
  entry: Omit<HistoryEntry, 'watchedAt' | 'sourceId'> & { sourceId?: string },
  userId?: string | null,
): Promise<void> => {
  // Tamu tidak dicatat sama sekali — riwayat adalah fitur akun.
  if (!userId) {
    return
  }

  const sourceId = entry.sourceId ?? currentSourceId()

  recordWatchHistory({
    sourceId,
    animeSlug: entry.animeSlug,
    episodeSlug: entry.episodeSlug,
    episodeLabel: entry.episodeLabel,
    title: entry.title,
    poster: entry.poster,
  })

  const client = requireSupabase()
  const { error } = await client.from('watch_history').upsert(
    {
      user_id: userId,
      source_id: sourceId,
      anime_slug: entry.animeSlug,
      episode_slug: entry.episodeSlug,
      episode_label: entry.episodeLabel,
      title: entry.title,
      poster: entry.poster,
      watched_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,source_id,episode_slug' },
  )

  if (error) {
    // Pemutaran tidak perlu terganggu hanya karena riwayat gagal tersimpan.
    console.warn('[satorustream] gagal menyimpan riwayat ke akun:', error.message)
  }
}

export const getHistory = async (userId?: string | null): Promise<HistoryEntry[]> => {
  if (!userId) {
    return []
  }

  const client = requireSupabase()
  const { data, error } = await client
    .from('watch_history')
    .select('source_id, anime_slug, episode_slug, episode_label, title, poster, watched_at')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
    .limit(200)

  if (error) {
    console.warn('[satorustream] gagal memuat riwayat:', error.message)
    return getWatchHistory().map((item) => ({
      sourceId: item.sourceId ?? currentSourceId(),
      animeSlug: item.animeSlug,
      episodeSlug: item.episodeSlug ?? '',
      episodeLabel: item.episodeLabel,
      title: item.title,
      poster: item.poster,
      watchedAt: item.watchedAt,
    }))
  }

  const entries: HistoryEntry[] = (data ?? []).map((row) => ({
    sourceId: row.source_id,
    animeSlug: row.anime_slug ?? undefined,
    episodeSlug: row.episode_slug,
    episodeLabel: row.episode_label ?? undefined,
    title: row.title ?? undefined,
    poster: row.poster ?? undefined,
    watchedAt: new Date(row.watched_at).getTime(),
  }))

  mergeWatchHistory(entries)
  return entries
}

export const clearHistoryEntry = async (
  episodeSlug: string,
  userId?: string | null,
  sourceId = currentSourceId(),
): Promise<void> => {
  if (!userId) {
    throw new AuthRequiredError('Mengubah riwayat')
  }

  const client = requireSupabase()
  const { error } = await client
    .from('watch_history')
    .delete()
    .eq('user_id', userId)
    .eq('source_id', sourceId)
    .eq('episode_slug', episodeSlug)

  if (error) {
    throw new Error(error.message)
  }

  mergeWatchHistory(
    getWatchHistory().filter(
      (item) => !(item.episodeSlug === episodeSlug && (item.sourceId ?? sourceId) === sourceId),
    ),
  )
}

/** Riwayat akun yang dicerminkan lokal, disaring untuk sumber yang aktif. */
export const getLocalHistoryForActiveSource = (): HistoryEntry[] => {
  const sourceId = currentSourceId()

  return getWatchHistory()
    .filter((item) => (item.sourceId ?? sourceId) === sourceId && item.episodeSlug)
    .map((item) => ({
      sourceId,
      animeSlug: item.animeSlug,
      episodeSlug: item.episodeSlug as string,
      episodeLabel: item.episodeLabel,
      title: item.title,
      poster: item.poster,
      watchedAt: item.watchedAt,
    }))
}
