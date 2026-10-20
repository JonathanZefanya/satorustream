import {
  Ban,
  CircleAlert,
  Hourglass,
  House,
  Layers,
  RefreshCw,
  SearchX,
  ServerCrash,
  ShieldAlert,
  Unplug,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { describeFailure, type FailureKind } from '../utils/errorInfo'

const ICONS: Record<FailureKind, LucideIcon> = {
  offline: WifiOff,
  network: Unplug,
  timeout: Hourglass,
  'not-found': SearchX,
  blocked: ShieldAlert,
  upstream: ServerCrash,
  unavailable: ServerCrash,
  'rate-limit': Hourglass,
  'bad-request': CircleAlert,
  unsupported: Ban,
  server: ServerCrash,
  unknown: CircleAlert,
}

interface ErrorStateProps {
  error: unknown
  title?: string
  description?: string
  onRetry?: () => void | Promise<void>
  compact?: boolean
  className?: string
}

const actionClass =
  'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60 dark:hover:border-rose-500/50 dark:hover:text-rose-300'

const ErrorState = ({ error, title, description, onRetry, compact = false, className = '' }: ErrorStateProps) => {
  const navigate = useNavigate()
  const [retrying, setRetrying] = useState(false)
  const info = describeFailure(error)
  const Icon = ICONS[info.kind]
  const body = description ?? info.description
  const showDetail = info.detail && info.detail !== body && info.detail !== title

  const retry = async () => {
    if (!onRetry) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {info.canRetry && onRetry && (
        <button type="button" onClick={() => void retry()} disabled={retrying} className={actionClass}>
          <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
          Coba lagi
        </button>
      )}
      {info.suggestSourceChange && (
        <button type="button" onClick={() => navigate('/')} className={actionClass}>
          <Layers className="h-3.5 w-3.5" />
          Ganti sumber
        </button>
      )}
      {info.suggestHome && !info.suggestSourceChange && (
        <button type="button" onClick={() => navigate('/')} className={actionClass}>
          <House className="h-3.5 w-3.5" />
          Ke beranda
        </button>
      )}
    </div>
  )

  if (compact) {
    return (
      <div
        role="alert"
        className={`flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200 ${className}`}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <p>
            <span className="font-semibold">{title ?? info.title}.</span> {body}
          </p>
          {actions}
        </div>
      </div>
    )
  }

  return (
    <div role="alert" className={`surface-panel flex flex-col items-center px-6 py-10 text-center ${className}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
        <Icon className="h-7 w-7" />
      </span>
      {info.status && (
        <span className="mt-4 rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-500">
          {info.status}
        </span>
      )}
      <h2 className="mt-3 text-lg font-bold text-slate-900">{title ?? info.title}</h2>
      {title && !description && <p className="mt-1 text-sm font-medium text-slate-700">{info.title}</p>}
      <p className="mt-1 max-w-md text-sm text-slate-600">{body}</p>
      {showDetail && (
        <details className="mt-3 max-w-md text-xs text-slate-500">
          <summary className="cursor-pointer select-none font-semibold hover:text-slate-700">Detail teknis</summary>
          <p className="mt-2 break-words rounded-lg bg-slate-100 px-3 py-2 text-left font-mono">{info.detail}</p>
        </details>
      )}
      <div className="mt-5">{actions}</div>
    </div>
  )
}

export default ErrorState
