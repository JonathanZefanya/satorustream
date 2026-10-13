import { describe, expect, it } from 'vitest'
import { encodeCompositeSlug, encodeSegment, idFromUrl, splitCompositeSlug } from './shared'

describe('slug gabungan', () => {
  it('disimpan sebagai satu segmen URL dan dipecah kembali', () => {
    const slug = encodeCompositeSlug('4468', 'sousou-no-frieren-2nd-season', '3')
    expect(slug).not.toContain('/')
    expect(splitCompositeSlug(slug)).toEqual(['4468', 'sousou-no-frieren-2nd-season', '3'])
  })

  it('menerima slug yang sudah di-decode React Router', () => {
    expect(splitCompositeSlug('5069/azur-lane')).toEqual(['5069', 'azur-lane'])
  })

  it('tiap bagian di-encode ulang supaya aman dipakai di path API', () => {
    expect(splitCompositeSlug(encodeCompositeSlug('1', 'a b?'))).toEqual(['1', 'a%20b%3F'])
  })

  it('percent-encoding rusak tidak membuat error', () => {
    expect(splitCompositeSlug('100%/x')).toEqual(['100%25', 'x'])
  })
})

describe('idFromUrl', () => {
  it('mengambil segmen terakhir tanpa query', () => {
    expect(idFromUrl('https://otakudesu.blog/episode/mychk-episode-1-sub-indo/?a=1')).toBe(
      'mychk-episode-1-sub-indo',
    )
  })

  it('kosong atau hanya origin menghasilkan undefined', () => {
    expect(idFromUrl('')).toBeUndefined()
    expect(idFromUrl('https:')).toBeUndefined()
  })
})

describe('encodeSegment', () => {
  it('meng-encode dan menolak nilai kosong', () => {
    expect(encodeSegment(' (uncen)-nande!~q ', 'Slug')).toBe('(uncen)-nande!~q')
    expect(() => encodeSegment('  ', 'Slug')).toThrow('Slug is required.')
  })
})
