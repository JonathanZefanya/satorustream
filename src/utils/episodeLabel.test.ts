import { describe, expect, it } from 'vitest'
import { episodeNumberFrom, episodeNumberValue, stripAnimeTitle } from './episodeLabel'

describe('stripAnimeTitle', () => {
  it('memangkas judul anime di awal label', () => {
    expect(stripAnimeTitle('Mayo Chiki! Episode 1 Subtitle Indonesia', 'Mayo Chiki!')).toBe(
      'Episode 1 Subtitle Indonesia',
    )
  })

  it('tidak peka huruf besar-kecil dan membuang pemisah', () => {
    expect(stripAnimeTitle('ONE PIECE - Episode 1100', 'One Piece')).toBe('Episode 1100')
  })

  it('label dibiarkan bila tidak diawali judul, atau isinya hanya judul', () => {
    expect(stripAnimeTitle('Episode 3', 'Frieren')).toBe('Episode 3')
    expect(stripAnimeTitle('Frieren', 'Frieren')).toBe('Frieren')
    expect(stripAnimeTitle('  Episode 3 ', undefined)).toBe('Episode 3')
  })
})

describe('episodeNumberFrom / episodeNumberValue', () => {
  it('mengutamakan angka setelah kata "episode"', () => {
    expect(episodeNumberFrom('Season 2 Episode 12 Sub Indo')).toBe('12')
    expect(episodeNumberValue('Episode 12.5')).toBe(12.5)
  })

  it('jatuh ke angka pertama, atau null tanpa angka', () => {
    expect(episodeNumberFrom('OVA 3')).toBe('3')
    expect(episodeNumberFrom('Movie')).toBeNull()
    expect(episodeNumberValue(undefined)).toBeNull()
  })
})
