const Footer = () => {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white/90">
      <div className="container-app py-6 text-center text-sm text-slate-500">
        <p>Built for anime discovery with Otakudesu scraper API.</p>
        <p className="mt-1">SatoruStream {new Date().getFullYear()}</p>
      </div>
    </footer>
  )
}

export default Footer