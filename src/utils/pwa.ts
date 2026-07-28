/**
 * Pendaftaran service worker dan alur pembaruan aplikasi.
 *
 * Service worker sengaja hanya aktif di build produksi. Di mode dev, cache-nya
 * membuat perubahan kode seolah tidak tersimpan karena aset lama ikut dilayani.
 */

const SERVICE_WORKER_URL = '/sw.js'

/** Selang pemeriksaan versi baru: satu jam. */
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000

let waitingWorker: ServiceWorker | null = null
let reloading = false

export const isPwaSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
}

/** True saat aplikasi dibuka dari ikon home screen, bukan dari tab peramban. */
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS memakai properti non-standar ini.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * Mendaftarkan service worker.
 *
 * @param onUpdateAvailable dipanggil saat versi baru sudah terunduh dan tinggal
 * menunggu persetujuan pengguna untuk dipakai.
 */
export const registerServiceWorker = (onUpdateAvailable?: () => void): void => {
  if (!isPwaSupported() || !import.meta.env.PROD) {
    return
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(SERVICE_WORKER_URL)
      .then((registration) => {
        // Sudah ada versi baru yang menunggu dari kunjungan sebelumnya.
        if (registration.waiting && navigator.serviceWorker.controller) {
          waitingWorker = registration.waiting
          onUpdateAvailable?.()
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing

          if (!installing) {
            return
          }

          installing.addEventListener('statechange', () => {
            // Tanpa `controller`, ini instalasi pertama — bukan pembaruan,
            // jadi tidak perlu mengganggu pengguna dengan notifikasi.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorker = installing
              onUpdateAvailable?.()
            }
          })
        })

        window.setInterval(() => {
          void registration.update()
        }, UPDATE_CHECK_INTERVAL)
      })
      .catch((error) => {
        console.warn('[satorustream] Service worker gagal didaftarkan.', error)
      })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) {
        return
      }

      reloading = true
      window.location.reload()
    })
  })
}

/** Mengaktifkan versi baru; halaman dimuat ulang lewat `controllerchange`. */
export const applyPendingUpdate = (): void => {
  waitingWorker?.postMessage({ type: 'SKIP_WAITING' })
  waitingWorker = null
}
