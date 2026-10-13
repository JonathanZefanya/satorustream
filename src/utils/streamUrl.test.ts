import { describe, expect, it } from 'vitest'
import { isDirectVideoUrl } from './streamUrl'

describe('isDirectVideoUrl', () => {
  it('file mp4/webm diputar dengan <video>', () => {
    expect(isDirectVideoUrl('https://cdn.example.com/a/Kuramanime-01-720p.mp4')).toBe(true)
    expect(isDirectVideoUrl('https://cdn.example.com/a.webm#t=10')).toBe(true)
    // URL proxy backend menaruh nama file .mp4 di path-nya.
    expect(
      isDirectVideoUrl('http://localhost:3001/otakudesu/play/video.mp4?url=https%3A%2F%2Fdesustream.com%2Fx'),
    ).toBe(true)
  })

  it('halaman pemutar dianggap embed', () => {
    expect(isDirectVideoUrl('https://desustream.com/dstream/desuwatch/new/index.php?id=x')).toBe(false)
    expect(isDirectVideoUrl('https://example.com/mp4-player')).toBe(false)
  })
})
