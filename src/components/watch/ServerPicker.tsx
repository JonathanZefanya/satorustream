import { Loader2 } from 'lucide-react'
import type { StreamServer } from '../../types/anime'
import { DEFAULT_SERVER_KEY } from './useStreamServers'

type ServerPickerProps = {
  servers: StreamServer[]
  hasDefault: boolean
  selectedServerKey: string
  loading: boolean
  error: string | null
  onPick: (server: StreamServer | null) => void
}

const ServerPicker = ({ servers, hasDefault, selectedServerKey, loading, error, onPick }: ServerPickerProps) => (
  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Server streaming</p>
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onPick(null)}
        disabled={!hasDefault}
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
          selectedServerKey === DEFAULT_SERVER_KEY
            ? 'border-rose-300 bg-rose-50 text-rose-600'
            : hasDefault
              ? 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600'
              : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
        }`}
      >
        Default
      </button>

      {servers.map((server) => {
        const isSelected = selectedServerKey === server.serverId

        return (
          <button
            key={server.serverId}
            type="button"
            onClick={() => onPick(server)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              isSelected
                ? 'border-rose-300 bg-rose-50 text-rose-600'
                : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600'
            }`}
          >
            {isSelected && loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {server.title}
          </button>
        )
      })}
    </div>

    {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    {servers.length === 0 ? (
      <p className="mt-2 text-xs text-slate-500">Server alternatif tidak tersedia untuk episode ini.</p>
    ) : null}
  </div>
)

export default ServerPicker
