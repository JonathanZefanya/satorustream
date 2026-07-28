import { Download, RefreshCw, Share, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { applyPendingUpdate, isStandalone, registerServiceWorker } from '../utils/pwa'

/** Event non-standar Chromium yang menunda dialog "Add to Home Screen". */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_STORAGE_KEY = 'satorustream-install-dismissed-at'

/** Tawaran pasang ditahan sebulan setelah pengguna menutupnya. */
const DISMISS_DURATION = 30 * 24 * 60 * 60 * 1000

const isRecentlyDismissed = (): boolean => {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_STORAGE_KEY) ?? '0')
    return Boolean(dismissedAt) && Date.now() - dismissedAt < DISMISS_DURATION
  } catch {
    return false
  }
}

const isIos = (): boolean => {
  const ua = window.navigator.userAgent

  // iPadOS 13+ menyamar sebagai Mac, jadi kehadiran layar sentuh ikut dicek.
  return /iphone|ipod|ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

const isSafari = (): boolean => {
  const ua = window.navigator.userAgent
  return /safari/i.test(ua) && !/chrome|crios|fxios|edgios/i.test(ua)
}

/**
 * Mengurus dua interaksi PWA sekaligus:
 *
 *   1. tawaran memasang aplikasi ke home screen
 *   2. pemberitahuan saat versi baru sudah siap dipakai
 *
 * Keduanya dijadikan satu banner supaya tidak pernah ada dua notifikasi
 * mengambang yang saling menimpa di layar kecil.
 */
const PwaPrompt = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    registerServiceWorker(() => setUpdateReady(true))
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Mencegah mini-infobar bawaan agar tawaran muncul di waktu yang kita pilih.
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setInstallEvent(null)
      setShowIosHint(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  useEffect(() => {
    // Safari iOS tidak punya `beforeinstallprompt`; pemasangan hanya bisa lewat
    // menu Bagikan, jadi yang bisa ditampilkan cuma petunjuknya.
    if (isStandalone() || isRecentlyDismissed() || !isIos() || !isSafari()) {
      return
    }

    const timer = window.setTimeout(() => setShowIosHint(true), 4000)
    return () => window.clearTimeout(timer)
  }, [])

  const handleInstall = async () => {
    if (!installEvent) {
      return
    }

    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice

    if (outcome === 'dismissed') {
      rememberDismissal()
    }

    setInstallEvent(null)
  }

  const rememberDismissal = () => {
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()))
    } catch {
      // Penyimpanan penuh atau diblokir: banner sekadar muncul lagi nanti.
    }
  }

  const handleDismiss = () => {
    rememberDismissal()
    setDismissed(true)
  }

  if (updateReady) {
    return (
      <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900 sm:inset-x-auto sm:right-4">
        <div className="flex items-start gap-3">
          <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Versi baru tersedia</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Muat ulang untuk memakai versi terbaru SatoruStream.
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={applyPendingUpdate}
            className="flex-1 rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-600"
          >
            Muat ulang
          </button>
          <button
            type="button"
            onClick={() => setUpdateReady(false)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-rose-600 dark:border-slate-700 dark:text-slate-300"
          >
            Nanti
          </button>
        </div>
      </div>
    )
  }

  if (dismissed || isStandalone() || (!installEvent && !showIosHint)) {
    return null
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900 sm:inset-x-auto sm:right-4">
      <div className="flex items-start gap-3">
        <img src="/favicon.svg" alt="" aria-hidden="true" className="mt-0.5 h-8 w-8" />
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Pasang SatoruStream</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {showIosHint ? (
              <>
                Ketuk <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Bagikan, lalu pilih{' '}
                <span className="font-semibold">Tambahkan ke Layar Utama</span>.
              </>
            ) : (
              'Buka langsung dari layar utama, tanpa bilah alamat, dan tetap bisa membuka halaman yang pernah dikunjungi saat offline.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Tutup tawaran pasang aplikasi"
          className="rounded-lg p-1 text-slate-400 transition hover:text-rose-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {installEvent && (
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-600"
        >
          <Download className="h-4 w-4" />
          Pasang aplikasi
        </button>
      )}
    </div>
  )
}

export default PwaPrompt
