import { describe, expect, it } from 'vitest'
import type { AnimeItem, PagedItems } from '../types/anime'
import { getDisplayPage } from './repaginate'

const makeSource = (sizes: number[]) => {
  let counter = 0
  const pages = sizes.map((size) => Array.from({ length: size }, () => ({ slug: `a${counter++}` }) as AnimeItem))
  const calls: number[] = []
  const fetcher = async (page: number): Promise<PagedItems<AnimeItem>> => {
    calls.push(page)
    return {
      items: pages[page - 1] ?? [],
      pagination: {
        current_page: page,
        last_visible_page: sizes.length,
        has_next_page: page < sizes.length,
        next_page: page < sizes.length ? page + 1 : null,
        has_previous_page: page > 1,
        previous_page: page > 1 ? page - 1 : null,
      },
    }
  }
  return { fetcher, calls }
}

describe('getDisplayPage', () => {
  it('setiap halaman tampilan berisi tepat 24 item berurutan', async () => {
    const { fetcher } = makeSource([25, 25, 25, 25, 25, 7])
    const first = await getDisplayPage('t1', fetcher, 1)
    const second = await getDisplayPage('t1', fetcher, 2)
    expect(first.items).toHaveLength(24)
    expect(second.items).toHaveLength(24)
    expect(first.items[23].slug).toBe('a23')
    expect(second.items[0].slug).toBe('a24')
    expect(first.pagination?.last_visible_page).toBe(6)
  })

  it('halaman terakhir menghitung total yang sebenarnya', async () => {
    const { fetcher } = makeSource([25, 25, 25, 25, 25, 7])
    const last = await getDisplayPage('t2', fetcher, 6)
    expect(last.items.map((item) => item.slug)).toEqual(['a120', 'a121', 'a122', 'a123', 'a124', 'a125', 'a126', 'a127', 'a128', 'a129', 'a130', 'a131'])
    expect(last.pagination?.last_visible_page).toBe(6)
    expect(last.pagination?.has_next_page).toBe(false)
  })

  it('halaman sumber yang lebih pendek diisi dari halaman berikutnya', async () => {
    const { fetcher } = makeSource([24, 20, 24, 24])
    const second = await getDisplayPage('t3', fetcher, 2)
    expect(second.items).toHaveLength(24)
  })

  it('halaman sumber di-cache', async () => {
    const { fetcher, calls } = makeSource([25, 25, 25])
    await getDisplayPage('t4', fetcher, 1)
    await getDisplayPage('t4', fetcher, 1)
    expect(calls.filter((page) => page === 1)).toHaveLength(1)
  })

  it('sumber tanpa total halaman (hanya tombol Next) tetap bisa dijelajahi', async () => {
    const sizes = Array.from({ length: 12 }, () => 10)
    let counter = 0
    const pages = sizes.map((size) => Array.from({ length: size }, () => ({ slug: `n${counter++}` }) as AnimeItem))
    const fetcher = async (page: number): Promise<PagedItems<AnimeItem>> => {
      if (page > sizes.length) throw new Error('404')
      const hasNext = page < sizes.length
      return {
        items: pages[page - 1],
        pagination: {
          current_page: page,
          last_visible_page: hasNext ? page + 1 : page,
          has_next_page: hasNext,
          next_page: hasNext ? page + 1 : null,
          has_previous_page: page > 1,
          previous_page: page > 1 ? page - 1 : null,
        },
      }
    }
    const first = await getDisplayPage('t5', fetcher, 1)
    expect(first.items).toHaveLength(24)
    expect(first.pagination?.has_next_page).toBe(true)
    const third = await getDisplayPage('t5', fetcher, 3)
    expect(third.items[0].slug).toBe('n48')
    const last = await getDisplayPage('t5', fetcher, 5)
    expect(last.items.map((item) => item.slug)).toEqual(Array.from({ length: 24 }, (_, i) => `n${96 + i}`))
    expect(last.pagination?.has_next_page).toBe(false)
    const beyond = await getDisplayPage('t5', fetcher, 7)
    expect(beyond.items).toHaveLength(0)
  })
})
