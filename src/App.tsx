import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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

const NotFoundPage = () => {
  return (
    <div className="container-app py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-xl font-bold text-slate-900">Page not found</p>
        <p className="mt-1 text-sm text-slate-500">The route you are looking for does not exist.</p>
      </div>
    </div>
  )
}

const AppLayout = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-x-0 top-[-180px] h-[300px] bg-gradient-to-b from-rose-100/60 to-transparent" />
      <Navbar />
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
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppLayout />
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
