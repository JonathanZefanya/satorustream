import { kuramanimeAdapter } from './kuramanime'
import { nimegamiAdapter } from './nimegami'
import { oploverzAdapter } from './oploverz'
import { otakudesuAdapter } from './otakudesu'
import type { SourceAdapter } from './types'

export const SOURCES: Record<string, SourceAdapter> = {
  otakudesu: otakudesuAdapter,
  oploverz: oploverzAdapter,
  nimegami: nimegamiAdapter,
  kuramanime: kuramanimeAdapter,
}

export const SOURCE_IDS = Object.keys(SOURCES)

const FALLBACK_SOURCE = 'otakudesu'
const STORAGE_KEY = 'satorustream-source-v1'

const normalize = (value?: string | null): string | null => {
  const cleaned = (value ?? '').trim().toLowerCase()
  return cleaned && SOURCES[cleaned] ? cleaned : null
}

/** Sumber bawaan dari env; dipakai saat pengguna belum pernah memilih. */
const envSourceId = normalize(import.meta.env.VITE_API_SOURCE) ?? FALLBACK_SOURCE

if (import.meta.env.VITE_API_SOURCE && !normalize(import.meta.env.VITE_API_SOURCE)) {
  console.warn(
    `[satorustream] VITE_API_SOURCE="${import.meta.env.VITE_API_SOURCE}" tidak dikenal. ` +
      `Pilihan: ${SOURCE_IDS.join(', ')}. Memakai "${FALLBACK_SOURCE}".`,
  )
}

const readStored = (): string | null => {
  try {
    return normalize(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

/**
 * Sumber aktif disimpan di modul (bukan hanya di state React) supaya fungsi
 * non-komponen seperti `services/api` dan `utils/*` bisa membacanya saat
 * dipanggil, tanpa harus menerima parameter tambahan di mana-mana.
 */
let currentSourceId = readStored() ?? envSourceId

export const getActiveSourceId = (): string => currentSourceId

export const getActiveSource = (): SourceAdapter => SOURCES[currentSourceId] ?? SOURCES[FALLBACK_SOURCE]

export const getCapabilities = () => getActiveSource().capabilities

/**
 * Ganti sumber aktif dan simpan pilihannya. Pilihan berlaku untuk tamu maupun
 * pengguna yang sudah masuk — env hanya menentukan nilai awal.
 */
export const setActiveSourceId = (id: string): string => {
  const next = normalize(id) ?? FALLBACK_SOURCE
  currentSourceId = next

  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Abaikan kegagalan storage; pilihan tetap berlaku untuk sesi ini.
  }

  return next
}

export type { SourceAdapter, SourceCapabilities } from './types'
export { UnsupportedFeatureError } from './types'
