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
