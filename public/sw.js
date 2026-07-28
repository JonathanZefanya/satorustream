/**
 * Service worker SatoruStream.
 *
 * Ditulis tangan (tanpa Workbox) supaya tidak menambah dependensi build.
 * Strategi per jenis permintaan:
 *
 *   navigasi (buka halaman) -> network-first, jatuh ke cache lalu /offline.html
 *   /assets/* (hasil build)  -> cache-first, karena namanya sudah ber-hash
 *   gambar (poster anime)    -> stale-while-revalidate, dibatasi jumlahnya
 *   permintaan API           -> selalu ke jaringan, biar data tidak basi
 *
 * Naikkan CACHE_VERSION setiap kali daftar APP_SHELL atau strategi berubah,
 * supaya cache lama dibersihkan saat activate.
 */

const CACHE_VERSION = 'v1'
const SHELL_CACHE = `satorustream-shell-${CACHE_VERSION}`
const ASSET_CACHE = `satorustream-assets-${CACHE_VERSION}`
const IMAGE_CACHE = `satorustream-images-${CACHE_VERSION}`
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE]

const OFFLINE_URL = '/offline.html'
const APP_SHELL = ['/', OFFLINE_URL, '/site.webmanifest', '/favicon.svg', '/favicon.png']

/** Batas jumlah gambar yang disimpan supaya kuota penyimpanan tidak jebol. */
const IMAGE_CACHE_LIMIT = 100

/** Menyimpan satu per satu: satu URL gagal tidak menggagalkan seluruh install. */
const precache = async () => {
  const cache = await caches.open(SHELL_CACHE)
  await Promise.all(
    APP_SHELL.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: 'reload' }))
      } catch {
        // Diabaikan: aset opsional yang gagal diambil tidak boleh membatalkan install.
      }
    }),
  )
}

const trimCache = async (cacheName, maxEntries) => {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()

  if (keys.length <= maxEntries) {
    return
  }

  // Entri tertua ada di depan daftar.
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)))
}

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    return cached
  }

  const response = await fetch(request)

  if (response.ok) {
    void cache.put(request, response.clone())
  }

  return response
}

const staleWhileRevalidate = async (request, cacheName, maxEntries) => {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const network = fetch(request)
    .then((response) => {
      // `response.ok` false untuk respons opaque (CORS), padahal poster dari CDN
      // pihak ketiga memang opaque. Statusnya 0 dan tetap layak disimpan.
      if (response.ok || response.type === 'opaque') {
        void cache.put(request, response.clone()).then(() => {
          if (maxEntries) {
            void trimCache(cacheName, maxEntries)
          }
        })
      }

      return response
    })
    .catch(() => cached)

  return cached ?? network
}

const networkFirstNavigation = async (event) => {
  try {
    const preloaded = await event.preloadResponse

    if (preloaded) {
      return preloaded
    }

    const response = await fetch(event.request)
    const cache = await caches.open(SHELL_CACHE)
    void cache.put('/', response.clone())
    return response
  } catch {
    const cache = await caches.open(SHELL_CACHE)
    // SPA: semua rute dilayani index.html yang sama, jadi cache '/' cukup.
    const cachedShell = await cache.match('/')
    return cachedShell ?? (await cache.match(OFFLINE_URL)) ?? Response.error()
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable()
      }

      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('satorustream-') && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      )

      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event))
    return
  }

  const isSameOrigin = url.origin === self.location.origin

  // Aset build Vite memakai nama ber-hash, jadi isinya tidak pernah berubah.
  if (isSameOrigin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE))
    return
  }

  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, IMAGE_CACHE_LIMIT))
    return
  }

  if (isSameOrigin && (request.destination === 'style' || request.destination === 'font' || url.pathname === '/site.webmanifest')) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE))
    return
  }

  // Sisanya (terutama panggilan API) dibiarkan lewat ke jaringan apa adanya.
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})
