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

export interface QueryChip {
  key: 'genre' | 'title'
  value: string
}

const quoteValue = (value: string) => (/\s/.test(value) ? `"${value}"` : value)

export const chipToken = (chip: QueryChip): string =>
  chip.key === 'genre' ? genreToken(chip.value) : `title:${quoteValue(chip.value)}`

export const chipFromToken = (key: string, value: string): QueryChip | null => {
  const normalizedKey = key.toLowerCase()
  const trimmed = value.trim()
  if (!trimmed) return null
  if (GENRE_KEYS.has(normalizedKey)) return { key: 'genre', value: normalizeGenre(trimmed) }
  if (TITLE_KEYS.has(normalizedKey)) return { key: 'title', value: trimmed }
  return null
}

const sameChip = (a: QueryChip, b: QueryChip) => a.key === b.key && a.value.toLowerCase() === b.value.toLowerCase()

export const addChip = (chips: QueryChip[], chip: QueryChip): QueryChip[] =>
  chips.some((item) => sameChip(item, chip)) ? chips : [...chips, chip]

/** Pisahkan token `key:value` yang dikenali menjadi chip; sisanya tetap teks bebas. */
export const splitQuery = (raw: string): { chips: QueryChip[]; text: string } => {
  let chips: QueryChip[] = []
  const text = raw.replace(TOKEN_PATTERN, (match, key: string, quoted?: string, bare?: string) => {
    const chip = chipFromToken(key, quoted ?? bare ?? '')
    if (!chip) return match
    chips = addChip(chips, chip)
    return ' '
  })
  return { chips, text: text.replace(/\s+/g, ' ').trim() }
}

const TRAILING_TOKEN = /(^|\s)([a-z]+):(?:"([^"]*)"|([^\s"]+))\s$/i

/** Token lengkap yang baru diakhiri spasi, untuk diubah menjadi chip saat mengetik. */
export const takeTrailingChip = (text: string): { chip: QueryChip; rest: string } | null => {
  const match = text.match(TRAILING_TOKEN)
  if (!match) return null
  const chip = chipFromToken(match[2], match[3] ?? match[4] ?? '')
  if (!chip) return null
  return { chip, rest: text.slice(0, match.index ?? 0) + (match[1] ?? '') }
}

export const joinQuery = (chips: QueryChip[], text: string): string =>
  [...chips.map(chipToken), text.trim()].filter(Boolean).join(' ')
