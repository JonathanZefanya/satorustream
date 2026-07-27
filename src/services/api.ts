/**
 * Fasad untuk sumber data aktif.
 *
 * Setiap sumber (otakudesu, oploverz, nimegami, kuramanime) punya adapter
 * sendiri di `services/sources/` yang memetakan respons superanime ke tipe
 * domain di `types/anime.ts`. Halaman cukup memanggil fungsi di sini dan tidak
 * perlu tahu sumber mana yang sedang dipakai.
 *
 * Adapter di-resolve pada saat pemanggilan, bukan saat modul dimuat, supaya
 * pergantian sumber dari UI langsung berlaku. Untuk nilai yang perlu memicu
 * render ulang (mis. daftar menu), pakai `useSource()` alih-alih fungsi di sini.
 */
import { getActiveSource } from './sources'
import { http } from './sources/shared'
import type { StreamServer } from '../types/anime'

export {
  getActiveSource,
  getActiveSourceId,
  getCapabilities,
  setActiveSourceId,
  SOURCES,
  SOURCE_IDS,
  UnsupportedFeatureError,
} from './sources'

export const getHome = () => getActiveSource().getHome()
export const getOngoingPage = (page = 1) => getActiveSource().getOngoingPage(page)
export const getCompletePage = (page = 1) => getActiveSource().getCompletePage(page)
export const getSchedule = () => getActiveSource().getSchedule()
export const getAnimeCollections = () => getActiveSource().getAnimeCollections()
export const getGenres = () => getActiveSource().getGenres()
export const getAnimeByGenre = (genreSlug: string, page = 1) =>
  getActiveSource().getAnimeByGenre(genreSlug, page)
export const searchAnime = (query: string) => getActiveSource().searchAnime(query)
export const getDetail = (endpoint: string) => getActiveSource().getDetail(endpoint)
export const getEpisode = (endpoint: string) => getActiveSource().getEpisode(endpoint)
export const getStreamServer = (server: StreamServer) => getActiveSource().getStreamServer(server)

export const getOngoing = async (page = 1) => (await getActiveSource().getOngoingPage(page)).items
export const getComplete = async (page = 1) => (await getActiveSource().getCompletePage(page)).items

export default http
