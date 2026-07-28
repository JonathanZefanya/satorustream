import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Mengatur judul dan meta tag per halaman.
 *
 * Aplikasi ini SPA tanpa server-side rendering, jadi tag yang ditulis di sini
 * baru muncul setelah JavaScript jalan. Googlebot merender JavaScript sehingga
 * tetap membacanya; sebagian besar bot media sosial tidak, dan mereka jatuh ke
 * nilai statis di `index.html`. Karena itu index.html tetap diisi lengkap.
 */

export const SITE_NAME = 'SatoruStream'

/** URL kanonis situs, tanpa garis miring di akhir. */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() ||
  (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/+$/, '')

const DEFAULT_IMAGE = `${SITE_URL}/favicon.png`

const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

const JSON_LD_ID = 'seo-runtime-jsonld'

export interface SeoOptions {
  /** Judul halaman tanpa nama situs; nama situs ditambahkan otomatis. */
  title?: string
  description?: string
  /** URL gambar preview. Path relatif otomatis dijadikan absolut. */
  image?: string
  /** Path kanonis. Bila kosong, dipakai path yang sedang dibuka. */
  canonicalPath?: string
  type?: 'website' | 'article' | 'video.movie' | 'video.episode' | 'video.tv_show' | 'profile'
  keywords?: string[]
  /** Halaman privat/berparameter yang tidak layak diindeks. */
  noIndex?: boolean
  /** Data terstruktur schema.org khusus halaman ini. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

const setMetaTag = (kind: 'name' | 'property', key: string, content: string): void => {
  const selector = `meta[${kind}="${key}"]`
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(kind, key)
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

const setCanonical = (href: string): void => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
}

const setJsonLd = (data: SeoOptions['jsonLd']): void => {
  const existing = document.getElementById(JSON_LD_ID)

  if (!data) {
    existing?.remove()
    return
  }

  const script = existing ?? document.createElement('script')
  script.id = JSON_LD_ID
  script.setAttribute('type', 'application/ld+json')
  script.textContent = JSON.stringify(data)

  if (!existing) {
    document.head.appendChild(script)
  }
}

/** Memangkas deskripsi ke panjang yang wajar untuk cuplikan hasil pencarian. */
export const truncate = (text: string, maxLength = 160): string => {
  const clean = text.replace(/\s+/g, ' ').trim()

  if (clean.length <= maxLength) {
    return clean
  }

  return `${clean.slice(0, maxLength - 1).trimEnd()}…`
}

const toAbsoluteUrl = (value: string): string => {
  if (/^https?:\/\//i.test(value)) {
    return value
  }

  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`
}

export const useSeo = (options: SeoOptions): void => {
  const location = useLocation()

  const serializedOptions = JSON.stringify(options)
  const currentPath = `${location.pathname}${location.search}`

  useEffect(() => {
    const {
      title,
      description,
      image,
      canonicalPath,
      type = 'website',
      keywords,
      noIndex = false,
      jsonLd,
    } = JSON.parse(serializedOptions) as SeoOptions

    const fullTitle = title
      ? title.includes(SITE_NAME)
        ? title
        : `${title} | ${SITE_NAME}`
      : `${SITE_NAME} — Nonton Anime Sub Indo Gratis`

    const finalDescription = description ? truncate(description) : ''
    const canonicalUrl = toAbsoluteUrl(canonicalPath ?? currentPath)
    const imageUrl = image ? toAbsoluteUrl(image) : DEFAULT_IMAGE

    document.title = fullTitle
    setCanonical(canonicalUrl)
    setMetaTag('name', 'robots', noIndex ? 'noindex, follow' : DEFAULT_ROBOTS)

    if (finalDescription) {
      setMetaTag('name', 'description', finalDescription)
      setMetaTag('property', 'og:description', finalDescription)
      setMetaTag('name', 'twitter:description', finalDescription)
    }

    if (keywords?.length) {
      setMetaTag('name', 'keywords', keywords.filter(Boolean).join(', '))
    }

    setMetaTag('property', 'og:title', fullTitle)
    setMetaTag('property', 'og:type', type)
    setMetaTag('property', 'og:url', canonicalUrl)
    setMetaTag('property', 'og:image', imageUrl)
    setMetaTag('name', 'twitter:title', fullTitle)
    setMetaTag('name', 'twitter:image', imageUrl)

    setJsonLd(jsonLd)

    return () => {
      // Data terstruktur milik halaman lama harus ikut hilang, kalau tidak
      // halaman berikutnya mewarisi schema yang salah.
      setJsonLd(undefined)
    }
  }, [currentPath, serializedOptions])
}

export default useSeo
