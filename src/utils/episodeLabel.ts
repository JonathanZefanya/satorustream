/**
 * Label episode dari sumber hampir selalu mengulang judul animenya, misalnya
 * "Kimi ga Shinu made Koi wo Shitai Episode 2 Sub Indo". Di layar judulnya sudah
 * tampil terpisah, jadi awalan itu dipangkas supaya tidak terbaca dua kali.
 */
export const stripAnimeTitle = (label?: string, title?: string): string => {
  const cleanLabel = (label ?? '').trim()
  const cleanTitle = (title ?? '').trim()

  if (!cleanLabel || !cleanTitle) {
    return cleanLabel
  }

  if (!cleanLabel.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
    return cleanLabel
  }

  return cleanLabel.slice(cleanTitle.length).replace(/^[\s\-–—:.]+/, '') || cleanLabel
}

/** Nomor episode untuk lencana kecil; null kalau labelnya tidak memuat angka. */
export const episodeNumberFrom = (label?: string): string | null => {
  const text = label ?? ''
  const match = /episode\s*(\d+(?:\.\d+)?)/i.exec(text) ?? /(\d+(?:\.\d+)?)/.exec(text)

  return match?.[1] ?? null
}
