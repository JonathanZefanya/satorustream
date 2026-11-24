import { describe, expect, it } from 'vitest'
import { isDirectVideoUrl, isValidPlayerUrl, needsNoReferrer } from './streamUrl'

describe('isDirectVideoUrl', () => {
  it('file mp4/webm diputar dengan <video>', () => {
    expect(isDirectVideoUrl('https://cdn.example.com/a/Kuramanime-01-720p.mp4')).toBe(true)
    expect(isDirectVideoUrl('https://cdn.example.com/a.webm#t=10')).toBe(true)
    // URL proxy backend menaruh nama file .mp4 di path-nya.
    expect(
      isDirectVideoUrl('http://localhost:3001/otakudesu/play/video.mp4?url=https%3A%2F%2Fdesustream.com%2Fx'),
    ).toBe(true)
    expect(
      isDirectVideoUrl('https://workers-anime.berkasdrive.com/https://rr1---sn-x.googlevideo.com/videoplayback?expire=1&id=x'),
    ).toBe(true)
  })

  it('halaman pemutar dianggap embed', () => {
    expect(isDirectVideoUrl('https://desustream.com/dstream/desuwatch/new/index.php?id=x')).toBe(false)
    expect(isDirectVideoUrl('https://example.com/mp4-player')).toBe(false)
    expect(
      isDirectVideoUrl('https://vsys-srv.berkasdrive.com/hal/streaming/abc?name=_Nimegami.id_x_Ep_1_720p.mp4'),
    ).toBe(false)
  })
})

describe('needsNoReferrer', () => {
  it('video berkasdrive diputar langsung tanpa referer', () => {
    const url = 'https://stream-stor.berkasdrive.com/v/v1.abcDEF_123'
    expect(needsNoReferrer(url)).toBe(true)
    expect(isDirectVideoUrl(url)).toBe(true)
    expect(needsNoReferrer('https://cdn.example.com/a.mp4')).toBe(false)
  })
})

describe('isValidPlayerUrl', () => {
  const origin = 'https://satorustream.example'

  it('URL absolut dari host lain diterima', () => {
    expect(isValidPlayerUrl('https://s3.animeverse.id/ro/a.mp4', origin)).toBe(true)
    expect(isValidPlayerUrl('http://localhost:3001/otakudesu/play/video.mp4', 'http://localhost:5173')).toBe(true)
  })

  it('tautan tersamar, relatif, atau non-http ditolak', () => {
    expect(isValidPlayerUrl('~NHBtLjIwMTQyNzQzNTA5NzEtNDc0ZA==', origin)).toBe(false)
    expect(isValidPlayerUrl('/watch/abc', origin)).toBe(false)
    expect(isValidPlayerUrl('javascript:alert(1)', origin)).toBe(false)
    expect(isValidPlayerUrl('', origin)).toBe(false)
  })

  it('URL yang mengarah ke aplikasi ini sendiri ditolak', () => {
    expect(isValidPlayerUrl('https://satorustream.example/watch/x', origin)).toBe(false)
  })
})
