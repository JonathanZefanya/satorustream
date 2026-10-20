import { describe, expect, it } from 'vitest'
import { ApiError } from '../services/sources/shared'
import { UnsupportedFeatureError } from '../services/sources/types'
import { describeFailure } from './errorInfo'

describe('describeFailure', () => {
  it('memetakan kode HTTP ke jenis error', () => {
    expect(describeFailure(new ApiError('http', 'x', 404)).kind).toBe('not-found')
    expect(describeFailure(new ApiError('http', 'x', 403)).kind).toBe('blocked')
    expect(describeFailure(new ApiError('http', 'x', 429)).kind).toBe('rate-limit')
    expect(describeFailure(new ApiError('http', 'x', 502)).kind).toBe('upstream')
    expect(describeFailure(new ApiError('http', 'x', 503)).kind).toBe('unavailable')
    expect(describeFailure(new ApiError('http', 'x', 504)).kind).toBe('timeout')
    expect(describeFailure(new ApiError('http', 'x', 500)).kind).toBe('server')
  })

  it('timeout, jaringan, dan data kosong', () => {
    expect(describeFailure(new ApiError('timeout', 'x')).kind).toBe('timeout')
    expect(describeFailure(new ApiError('network', 'x')).kind).toBe('network')
    expect(describeFailure(new ApiError('empty', 'x', 200)).kind).toBe('not-found')
  })

  it('fitur yang tidak didukung sumber', () => {
    const info = describeFailure(new UnsupportedFeatureError('Nimegami', 'Jadwal rilis'))
    expect(info.kind).toBe('unsupported')
    expect(info.suggestSourceChange).toBe(true)
    expect(info.canRetry).toBe(false)
  })

  it('pesan server disimpan sebagai detail', () => {
    const info = describeFailure(new ApiError('http', 'Upstream returned 502', 502))
    expect(info.status).toBe(502)
    expect(info.detail).toBe('Upstream returned 502')
  })
})
