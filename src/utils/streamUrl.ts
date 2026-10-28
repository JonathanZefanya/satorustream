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

/** Server video yang menolak (403) permintaan ber-Referer dari domain lain. */
const NO_REFERRER_VIDEO_HOSTS = ['stream-stor.berkasdrive.com']

export const needsNoReferrer = (url: string): boolean => NO_REFERRER_VIDEO_HOSTS.includes(hostOf(url))

/** File video langsung diputar dengan <video>; selain itu dianggap halaman embed. */
export const isDirectVideoUrl = (url: string): boolean =>
  /\.(mp4|webm)$/i.test(pathOf(url)) ||
  /googlevideo\.com\/videoplayback\?/i.test(url) ||
  needsNoReferrer(url)
