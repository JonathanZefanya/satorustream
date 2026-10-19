export interface ParsedQuery {
  title: string
  genres: string[]
}

const TITLE_KEYS = new Set(['title', 'tittle', 'judul', 't'])
const GENRE_KEYS = new Set(['genre', 'g'])
const TOKEN_PATTERN = /([a-z]+):(?:"([^"]*)"|(\S+))/gi

export const normalizeGenre = (value: string): string =>
  value.toLowerCase().replace(/[-_\s]+/g, ' ').trim()

export const genreToken = (name: string): string => `genre:${normalizeGenre(name).replace(/ /g, '-')}`

export const parseSearchQuery = (raw: string): ParsedQuery => {
  const titleParts: string[] = []
  const genres: string[] = []

  const rest = raw.replace(TOKEN_PATTERN, (match, key: string, quoted?: string, bare?: string) => {
    const value = (quoted ?? bare ?? '').trim()
    const normalizedKey = key.toLowerCase()
    if (GENRE_KEYS.has(normalizedKey)) {
      if (value) genres.push(normalizeGenre(value))
      return ' '
    }
    if (TITLE_KEYS.has(normalizedKey)) {
      if (value) titleParts.push(value)
      return ' '
    }
    return match
  })

  titleParts.push(...rest.split(/\s+/).filter(Boolean))

  return { title: titleParts.join(' ').trim(), genres: [...new Set(genres)] }
}

export const buildSearchQuery = ({ title, genres }: ParsedQuery): string =>
  [...genres.map(genreToken), title ? `title:${title.includes(' ') ? `"${title}"` : title}` : '']
    .filter(Boolean)
    .join(' ')
