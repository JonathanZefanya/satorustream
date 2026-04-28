const Footer = () => {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/85">
      <div className="container-app py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>Built by Xeadesta.</p>
        <p className="mt-1">SatoruStream {new Date().getFullYear()} - cozy nights, clear streams.</p>
      </div>
    </footer>
  )
}

export default Footer