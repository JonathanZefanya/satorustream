const pathOf = (url: string): string => {
  try {
    return new URL(url).pathname
  } catch {
    return url.split(/[?#]/)[0]
  }
}

/** File video langsung diputar dengan <video>; selain itu dianggap halaman embed. */
export const isDirectVideoUrl = (url: string): boolean =>
  /\.(mp4|webm)$/i.test(pathOf(url)) || /googlevideo\.com\/videoplayback\?/i.test(url)
