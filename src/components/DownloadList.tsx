import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { resolveDownload } from '../services/api'
import type { EpisodeDetail } from '../types/anime'

interface DownloadListProps {
  downloads: EpisodeDetail['download_urls']
}

type Group = { resolution: string; urls: { provider?: string; url?: string }[] }

const toGroups = (downloads: DownloadListProps['downloads']): Group[] => {
  if (!downloads) {
    return []
  }

  return (['mkv', 'mp4'] as const).flatMap((container) =>
    (downloads[container] ?? [])
      .filter((entry) => entry.urls?.length)
      .map((entry) => ({ resolution: entry.resolution ?? '', urls: entry.urls })),
  )
}

const DownloadList = ({ downloads }: DownloadListProps) => {
  const [pending, setPending] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  const groups = toGroups(downloads)

  const handleOpen = async (url: string) => {
    setPending(url)
    setFailed(null)

    const tab = window.open('', '_blank')
    if (tab) tab.opener = null

    try {
      const resolved = await resolveDownload(url)

      if (tab) {
        tab.location.href = resolved
      } else {
        // Popup diblokir: buka di tab yang sama sebagai cadangan.
        window.location.assign(resolved)
      }
    } catch {
      tab?.close()
      setFailed(url)
    } finally {
      setPending(null)
    }
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        Tautan unduhan tidak tersedia untuk episode ini.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div
          key={group.resolution}
          className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {group.resolution}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {group.urls.map((link) =>
              link.url ? (
                <button
                  key={link.url}
                  type="button"
                  onClick={() => void handleOpen(link.url as string)}
                  disabled={pending === link.url}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-wait disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  {pending === link.url ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {link.provider || 'Download'}
                </button>
              ) : null,
            )}
          </div>

          {group.urls.some((link) => link.url && link.url === failed) ? (
            <p className="mt-2 text-xs text-rose-600">
              Gagal membuka tautan ini. Coba host lain atau ulangi sebentar lagi.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export default DownloadList
