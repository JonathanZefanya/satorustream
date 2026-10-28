import { Clapperboard, Loader2 } from 'lucide-react'
import { isDirectVideoUrl, needsNoReferrer } from '../../utils/streamUrl'

type StreamPlayerProps = {
  url: string | null
  title: string
  loading: boolean
}

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * <video> tidak punya atribut referrerpolicy, jadi video yang menolak Referer
 * dibungkus dokumen srcdoc dengan kebijakan no-referrer.
 */
const noReferrerDocument = (url: string) =>
  `<!doctype html><meta name="referrer" content="no-referrer"><style>html,body{margin:0;height:100%;background:#020617}video{display:block;width:100%;height:100%}</style><video src="${escapeAttr(url)}" controls playsinline preload="metadata"></video>`

const StreamPlayer = ({ url, title, loading }: StreamPlayerProps) => {
  if (url && needsNoReferrer(url)) {
    return (
      <iframe
        key={url}
        srcDoc={noReferrerDocument(url)}
        title={title}
        referrerPolicy="no-referrer"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="w-full aspect-video rounded-xl bg-slate-950"
      />
    )
  }

  if (url && isDirectVideoUrl(url)) {
    return (
      <video
        key={url}
        src={url}
        title={title}
        controls
        playsInline
        preload="metadata"
        className="w-full aspect-video rounded-xl bg-slate-950"
      />
    )
  }

  if (url) {
    return (
      <iframe
        src={url}
        title={title}
        referrerPolicy="no-referrer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="w-full aspect-video rounded-xl bg-slate-950"
      />
    )
  }

  return (
    <div className="flex w-full aspect-video items-center justify-center rounded-xl bg-slate-100 text-slate-600">
      <div className="text-center">
        {loading ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-2 text-sm">Memuat server...</p>
          </>
        ) : (
          <>
            <Clapperboard className="mx-auto h-8 w-8" />
            <p className="mt-2 text-sm">
              Server ini tidak mengirimkan tautan pemutar. Coba pilih server lain di atas.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default StreamPlayer
