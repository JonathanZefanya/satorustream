import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY = 'satorustream-scroll-v1'
// Data halaman datang asinkron, jadi tinggi dokumen belum final saat mount.
// Posisi lama dicoba dipulihkan berulang sampai kontennya cukup panjang.
const RESTORE_TIMEOUT_MS = 4000
const INITIAL_LOAD_WINDOW_MS = 1500

type ScrollMap = Record<string, number>

const readMap = (): ScrollMap => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ScrollMap) : {}
  } catch {
    return {}
  }
}

const writeOffset = (key: string, offset: number): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readMap(), [key]: offset }))
  } catch {
    // Abaikan kegagalan storage (mode privat / kuota penuh).
  }
}

/**
 * Refresh mengembalikan pengguna ke posisi terakhirnya, sedangkan perpindahan
 * halaman biasa tetap mulai dari atas.
 */
export const useScrollRestoration = (): void => {
  const location = useLocation()
  const key = `${location.pathname}${location.search}`
  const lastKey = useRef<string | null>(null)
  const handled = useRef(false)

  useEffect(() => {
    history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    const persist = () => writeOffset(key, window.scrollY)

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(persist)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', persist)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', persist)
    }
  }, [key])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const isFirstLoad = lastKey.current === null
    const isNewKey = lastKey.current !== key

    if (isNewKey) {
      lastKey.current = key
      handled.current = false
    }

    // StrictMode memasang ulang efek dengan kunci yang sama saat pengembangan.
    // Pemasangan ulang itu harus melanjutkan pemulihan yang dibatalkan cleanup,
    // tapi tidak boleh menggeser posisi yang sudah selesai ditangani.
    if (handled.current) {
      return
    }

    // Beberapa halaman merapikan URL-nya sendiri saat mount (mis. daftar A-Z
    // menyalin huruf terakhir ke query), sehingga kunci berubah sekali di awal.
    // Perubahan dalam jendela ini masih dihitung sebagai bagian dari refresh.
    if (!isFirstLoad && isNewKey && performance.now() > INITIAL_LOAD_WINDOW_MS) {
      handled.current = true
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
      return
    }

    const target = readMap()[key] ?? 0
    if (target <= 0) {
      handled.current = true
      return
    }

    const deadline = Date.now() + RESTORE_TIMEOUT_MS
    let frame = 0

    const restore = () => {
      const maxOffset = document.documentElement.scrollHeight - window.innerHeight

      if (maxOffset >= target) {
        handled.current = true
        // `html { scroll-behavior: smooth }` membuat `auto` ikut beranimasi;
        // pemulihan harus langsung mendarat di posisinya tanpa terlihat gulir.
        window.scrollTo({ top: target, behavior: 'instant' })
        return
      }

      if (Date.now() < deadline) {
        frame = requestAnimationFrame(restore)
      }
    }

    frame = requestAnimationFrame(restore)

    return () => cancelAnimationFrame(frame)
  }, [key])
}
