import { LogIn, LogOut, Moon, Sun, TvMinimalPlay } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/authContext'
import ConfirmDialog from './ConfirmDialog'
import { useSource } from '../contexts/sourceContext'
import MainNav from './navbar/MainNav'
import SearchBox from './navbar/SearchBox'
import SourcePicker from './navbar/SourcePicker'
import { controlClass } from './navbar/styles'

interface NavbarProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

const Navbar = ({ theme, onToggleTheme }: NavbarProps) => {
  const location = useLocation()
  const { user, enabled: authEnabled, signOut } = useAuth()
  const { sourceId, options, setSourceId } = useSource()
  const [isScrolled, setIsScrolled] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const closeSignOut = () => {
    setConfirmSignOut(false)
    setSignOutError(null)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    setSignOutError(null)

    try {
      await signOut()
      setConfirmSignOut(false)
    } catch (err) {
      setSignOutError(err instanceof Error ? err.message : 'Gagal keluar. Coba lagi.')
    } finally {
      setSigningOut(false)
    }
  }

  const accountName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split('@')[0]

  // Pemilih sumber hanya relevan sekali di awal: begitu sebuah sumber dipakai,
  // slug anime, riwayat, dan wishlist semuanya terikat padanya. Jadi tombolnya
  // cukup ada di beranda dan tidak ikut meramaikan header di halaman lain.
  const isHome = location.pathname === '/'

  // Header menempel di atas; bayangannya baru muncul setelah halaman digulir
  // supaya saat di puncak tampilannya menyatu dengan latar.
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8)

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isLightMode = theme === 'light'

  return (
    <header
      className={`app-header sticky top-0 z-40 border-b transition-shadow duration-200 ${
        isScrolled
          ? 'border-slate-200 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.45)]'
          : 'border-transparent dark:border-transparent'
      }`}
    >
      <div className="container-app py-3">
        {/* Satu baris fleksibel yang diatur lewat `order`. Di layar kecil isinya
            melipat jadi dua baris (identitas + tombol, lalu pencarian + sumber),
            sedangkan di layar lebar semuanya sejajar dalam satu baris. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
          <Link
            to="/"
            className="order-1 mr-auto flex shrink-0 items-center gap-2.5 text-slate-900 md:mr-0 dark:text-slate-100"
          >
            <span className="rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 p-2 text-white shadow-[0_6px_16px_-8px_rgba(225,29,72,0.7)]">
              <TvMinimalPlay className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="whitespace-nowrap text-lg font-extrabold tracking-tight">
                SatoruStream
              </span>
              <span className="hidden whitespace-nowrap text-[11px] font-medium text-slate-500 sm:block dark:text-slate-400">
                Your nightly anime orbit
              </span>
            </span>
          </Link>

          {/* Pemaksa pindah baris di layar kecil supaya pencarian selalu mulai
              dari baris baru, bukan berdesakan dengan identitas situs. */}
          <div className="order-2 basis-full md:hidden" aria-hidden="true" />

          <SearchBox />

          {/* Pemilih platform, khusus beranda. Tersedia untuk tamu maupun
              pengguna yang sudah masuk; pilihannya disimpan per perangkat,
              dengan VITE_API_SOURCE sebagai nilai awal. */}
          {isHome && <SourcePicker value={sourceId} options={options} onChange={setSourceId} />}

          <div className="order-1 flex shrink-0 items-center gap-2 md:order-4">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              title={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              className={`${controlClass} w-10`}
            >
              {isLightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            {/* Tombol akun hanya muncul kalau Supabase dikonfigurasi. Tanpa itu
                wishlist dan riwayat tetap jalan secara lokal. */}
            {authEnabled &&
              (user ? (
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(true)}
                  title={`Keluar dari ${accountName ?? 'akun'}`}
                  className={`${controlClass} w-10 gap-1.5 px-0 sm:w-auto sm:px-3`}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden max-w-[7rem] truncate text-xs font-semibold sm:inline">
                    {accountName}
                  </span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Masuk</span>
                </Link>
              ))}
          </div>
        </div>

        <MainNav />
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        title="Keluar dari akun?"
        description={
          <>
            <p>
              Kamu akan keluar dari <span className="font-semibold">{accountName ?? 'akun ini'}</span>.
              Wishlist dan riwayat tetap tersimpan di akunmu dan muncul lagi saat masuk kembali.
            </p>
            {signOutError ? <p className="mt-2 text-rose-600 dark:text-rose-400">{signOutError}</p> : null}
          </>
        }
        confirmLabel="Keluar"
        tone="danger"
        busy={signingOut}
        onConfirm={() => void handleSignOut()}
        onCancel={closeSignOut}
      />
    </header>
  )
}

export default Navbar
