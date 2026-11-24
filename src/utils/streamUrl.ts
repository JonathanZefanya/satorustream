const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname
  } catch {
    return url.split(/[?#]/)[0]
  }
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

const currentOrigin = (): string => (typeof window === 'undefined' ? '' : window.location.origin)

/**
 * URL pemutar harus absolut (http/https) dan bukan dari domain aplikasi ini.
 * Tautan yang rusak atau tersamar (mis. "~NHBt...") akan dibaca browser sebagai
 * path relatif, sehingga iframe malah memuat SatoruStream sendiri.
 */
export const isValidPlayerUrl = (url: string, origin: string = currentOrigin()): boolean => {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    return !origin || parsed.origin !== origin
  } catch {
    return false
  }
}

/** Server video yang menolak (403) permintaan ber-Referer dari domain lain. */
const NO_REFERRER_VIDEO_HOSTS = ['stream-stor.berkasdrive.com']

export const needsNoReferrer = (url: string): boolean => NO_REFERRER_VIDEO_HOSTS.includes(hostOf(url))

/** File video langsung diputar dengan <video>; selain itu dianggap halaman embed. */
export const isDirectVideoUrl = (url: string): boolean =>
  /\.(mp4|webm)$/i.test(pathOf(url)) ||
  /googlevideo\.com\/videoplayback\?/i.test(url) ||
  needsNoReferrer(url)
