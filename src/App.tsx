import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import AnimeListPage from './pages/AnimeListPage'
import DetailPage from './pages/DetailPage'
import GenreListPage from './pages/GenreListPage'
import HomePage from './pages/HomePage'
import JadwalRilisPage from './pages/JadwalRilisPage'
import OngoingPage from './pages/OngoingPage'
import SearchPage from './pages/SearchPage'
import WatchPage from './pages/WatchPage'

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'satorustream-theme'

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  return savedTheme === 'dark' ? 'dark' : 'light'
}

const NotFoundPage = () => {
  return (
    <div className="container-app py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">Page not found</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The route you are looking for does not exist.</p>
      </div>
    </div>
  )
}

interface AppLayoutProps {
  theme: Theme
  onToggleTheme: () => void
}

const AppLayout = ({ theme, onToggleTheme }: AppLayoutProps) => {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [location.pathname, location.search])

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-x-0 top-[-180px] h-[300px] bg-gradient-to-b from-rose-100/60 to-transparent dark:from-rose-900/25" />
      <Navbar theme={theme} onToggleTheme={onToggleTheme} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/anime-list" element={<AnimeListPage />} />
          <Route path="/jadwal-rilis" element={<JadwalRilisPage />} />
          <Route path="/ongoing" element={<OngoingPage />} />
          <Route path="/genres" element={<GenreListPage />} />
          <Route path="/anime/:endpoint" element={<DetailPage />} />
          <Route path="/watch/:endpoint" element={<WatchPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const handleToggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppLayout theme={theme} onToggleTheme={handleToggleTheme} />
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
