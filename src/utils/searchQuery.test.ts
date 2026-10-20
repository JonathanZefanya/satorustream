import { describe, expect, it } from 'vitest'
import { buildSearchQuery, joinQuery, parseSearchQuery, splitQuery, takeTrailingChip } from './searchQuery'

describe('parseSearchQuery', () => {
  it('teks biasa dianggap judul', () => {
    expect(parseSearchQuery('kaguya sama')).toEqual({ title: 'kaguya sama', genres: [] })
  })

  it('genre dan title bisa dicampur', () => {
    expect(parseSearchQuery('genre:comedy genre:romance title:kaguya')).toEqual({
      title: 'kaguya',
      genres: ['comedy', 'romance'],
    })
    expect(parseSearchQuery('tittle:kaguya genre:Slice-of-Life')).toEqual({
      title: 'kaguya',
      genres: ['slice of life'],
    })
  })

  it('nilai berkutip dan genre ganda', () => {
    expect(parseSearchQuery('title:"oshi no ko" genre:"sci fi" genre:sci-fi')).toEqual({
      title: 'oshi no ko',
      genres: ['sci fi'],
    })
  })

  it('awalan yang tidak dikenal tetap bagian judul', () => {
    expect(parseSearchQuery('re:zero')).toEqual({ title: 're:zero', genres: [] })
  })
})

describe('buildSearchQuery', () => {
  it('menyusun ulang kueri yang bisa diparse kembali', () => {
    const query = buildSearchQuery({ title: 'oshi no ko', genres: ['slice of life'] })
    expect(query).toBe('genre:slice-of-life title:"oshi no ko"')
    expect(parseSearchQuery(query)).toEqual({ title: 'oshi no ko', genres: ['slice of life'] })
  })
})

describe('chip kueri', () => {
  it('memisahkan token dikenal menjadi chip', () => {
    expect(splitQuery('genre:harem genre:comedy kaguya title:"oshi no ko"')).toEqual({
      chips: [
        { key: 'genre', value: 'harem' },
        { key: 'genre', value: 'comedy' },
        { key: 'title', value: 'oshi no ko' },
      ],
      text: 'kaguya',
    })
  })

  it('token yang diakhiri spasi berubah menjadi chip', () => {
    expect(takeTrailingChip('kaguya genre:romance ')).toEqual({
      chip: { key: 'genre', value: 'romance' },
      rest: 'kaguya ',
    })
    expect(takeTrailingChip('title:"oshi no ko" ')).toEqual({ chip: { key: 'title', value: 'oshi no ko' }, rest: '' })
    expect(takeTrailingChip('kaguya ')).toBeNull()
    expect(takeTrailingChip('re:zero ')).toBeNull()
  })

  it('chip dan teks digabung kembali menjadi kueri', () => {
    const query = joinQuery([{ key: 'genre', value: 'slice of life' }, { key: 'title', value: 'oshi no ko' }], 'extra')
    expect(query).toBe('genre:slice-of-life title:"oshi no ko" extra')
    expect(splitQuery(query).chips).toHaveLength(2)
  })
})
