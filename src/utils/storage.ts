import { getActiveSourceId } from '../services/sources'

/**
 * Cache yang diindeks per slug tidak boleh dipakai lintas sumber: slug yang
 * sama bisa merujuk anime berbeda di Otakudesu dan Oploverz. Kuncinya diberi
 * akhiran id sumber supaya tiap platform punya cache sendiri.
 */
export const scopedKey = (base: string): string => `${base}::${getActiveSourceId()}`

export const readJson = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Abaikan kegagalan storage (mode privat / kuota penuh).
  }
}

export const removeKey = (key: string): void => {
  try {
    localStorage.removeItem(key)
  } catch {
    // Abaikan.
  }
}
