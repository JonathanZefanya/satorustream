import { ApiError } from '../services/sources/shared'

export type FailureKind =
  | 'offline'
  | 'network'
  | 'timeout'
  | 'not-found'
  | 'blocked'
  | 'upstream'
  | 'unavailable'
  | 'rate-limit'
  | 'bad-request'
  | 'unsupported'
  | 'server'
  | 'unknown'

export interface FailureInfo {
  kind: FailureKind
  status?: number
  title: string
  description: string
  detail?: string
  canRetry: boolean
  suggestSourceChange: boolean
  suggestHome: boolean
}

type Preset = Omit<FailureInfo, 'kind' | 'status' | 'detail'>

const PRESETS: Record<FailureKind, Preset> = {
  offline: {
    title: 'Kamu sedang offline',
    description: 'Periksa koneksi internet, lalu coba lagi.',
    canRetry: true,
    suggestSourceChange: false,
    suggestHome: false,
  },
  network: {
    title: 'Server SatoruStream tidak bisa dihubungi',
    description: 'API sedang mati atau alamatnya salah. Coba lagi beberapa saat lagi.',
    canRetry: true,
    suggestSourceChange: false,
    suggestHome: false,
  },
  timeout: {
    title: 'Situs sumber lambat merespons',
    description: 'Situs sumber sedang sibuk. Coba lagi sebentar lagi, atau pindah ke sumber lain.',
    canRetry: true,
    suggestSourceChange: true,
    suggestHome: false,
  },
  'not-found': {
    title: 'Data tidak ditemukan',
    description: 'Anime atau episode ini mungkin sudah dihapus atau pindah alamat di situs sumber.',
    canRetry: true,
    suggestSourceChange: false,
    suggestHome: true,
  },
  blocked: {
    title: 'Akses ke situs sumber ditolak',
    description: 'Situs sumber memblokir permintaan dari server kami. Pilih sumber lain untuk sementara.',
    canRetry: true,
    suggestSourceChange: true,
    suggestHome: false,
  },
  upstream: {
    title: 'Situs sumber sedang bermasalah',
    description: 'Situs sumber error atau baru mengubah tampilannya. Coba lagi, atau pindah ke sumber lain.',
    canRetry: true,
    suggestSourceChange: true,
    suggestHome: false,
  },
  unavailable: {
    title: 'Layanan sedang tidak tersedia',
    description: 'Server sedang dalam perawatan atau kelebihan beban. Coba lagi beberapa saat lagi.',
    canRetry: true,
    suggestSourceChange: false,
    suggestHome: false,
  },
  'rate-limit': {
    title: 'Terlalu banyak permintaan',
    description: 'Tunggu sebentar sebelum mencoba lagi.',
    canRetry: true,
    suggestSourceChange: false,
    suggestHome: false,
  },
  'bad-request': {
    title: 'Alamat halaman tidak valid',
    description: 'Tautan ini tidak lengkap atau formatnya salah.',
    canRetry: false,
    suggestSourceChange: false,
    suggestHome: true,
  },
  unsupported: {
    title: 'Fitur tidak tersedia di sumber ini',
    description: 'Sumber yang sedang aktif tidak mendukung fitur ini. Pilih sumber lain dari beranda.',
    canRetry: false,
    suggestSourceChange: true,
    suggestHome: true,
  },
  server: {
    title: 'Terjadi kesalahan di server',
    description: 'Ada yang tidak beres di sisi server. Coba lagi beberapa saat lagi.',
    canRetry: true,
    suggestSourceChange: false,
    suggestHome: false,
  },
  unknown: {
    title: 'Terjadi kesalahan',
    description: 'Sesuatu tidak berjalan semestinya. Coba lagi.',
    canRetry: true,
    suggestSourceChange: false,
    suggestHome: false,
  },
}

const kindFromStatus = (status: number): FailureKind => {
  if (status === 400 || status === 422) return 'bad-request'
  if (status === 403) return 'blocked'
  if (status === 404) return 'not-found'
  if (status === 429) return 'rate-limit'
  if (status === 502) return 'upstream'
  if (status === 503) return 'unavailable'
  if (status === 504) return 'timeout'
  if (status >= 500) return 'server'
  return 'unknown'
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

export const describeFailure = (error: unknown): FailureInfo => {
  let kind: FailureKind = 'unknown'
  let status: number | undefined
  let detail: string | undefined

  if (error instanceof ApiError) {
    status = error.status
    detail = error.message
    if (error.kind === 'timeout') kind = 'timeout'
    else if (error.kind === 'network') kind = isOffline() ? 'offline' : 'network'
    else if (error.kind === 'empty') kind = status && status >= 400 ? kindFromStatus(status) : 'not-found'
    else kind = status ? kindFromStatus(status) : 'unknown'
  } else if (error instanceof Error) {
    detail = error.message
    kind = error.name === 'UnsupportedFeatureError' ? 'unsupported' : isOffline() ? 'offline' : 'unknown'
  } else if (typeof error === 'string' && error) {
    detail = error
  }

  return { kind, status, detail, ...PRESETS[kind] }
}
