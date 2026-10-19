import { describe, expect, it } from 'vitest'
import { buildSearchQuery, parseSearchQuery } from './searchQuery'

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
