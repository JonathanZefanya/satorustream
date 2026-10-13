/** File video langsung diputar dengan <video>; selain itu dianggap halaman embed. */
export const isDirectVideoUrl = (url: string): boolean => /\.(mp4|webm)(\?|#|$)/i.test(url)
