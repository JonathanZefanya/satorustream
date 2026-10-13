import { Clapperboard, Loader2 } from 'lucide-react'
import { isDirectVideoUrl } from '../../utils/streamUrl'

type StreamPlayerProps = {
  url: string | null
  title: string
  loading: boolean
}

const StreamPlayer = ({ url, title, loading }: StreamPlayerProps) => {
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
