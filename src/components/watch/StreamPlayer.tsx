import { useState, type ReactNode } from 'react'
import { AlertTriangle, Clapperboard, Loader2 } from 'lucide-react'
import { isDirectVideoUrl, isValidPlayerUrl, needsNoReferrer } from '../../utils/streamUrl'

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

const PlayerMessage = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <div className="flex w-full aspect-video items-center justify-center rounded-xl bg-slate-100 px-6 text-slate-600">
    <div className="max-w-md text-center">
      {icon}
      <div className="mt-2 text-sm">{children}</div>
    </div>
  </div>
)

const PlayerError = ({ message }: { message: string }) => (
  <PlayerMessage icon={<AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />}>
    <p className="font-medium text-slate-800">Video tidak bisa diputar</p>
    <p className="mt-1">{message}</p>
  </PlayerMessage>
)

/** <video> dengan pesan error bila file gagal dimuat (403, 404, format tak didukung). */
const DirectVideo = ({ url, title }: { url: string; title: string }) => {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <PlayerError message="File video dari server ini gagal dimuat atau sudah tidak tersedia. Coba pilih server atau resolusi lain di atas." />
    )
  }

  return (
    <video
      src={url}
      title={title}
      controls
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
      className="w-full aspect-video rounded-xl bg-slate-950"
    />
  )
}

const StreamPlayer = ({ url, title, loading }: StreamPlayerProps) => {
  // Tautan rusak/tersamar jangan sampai masuk iframe: browser akan
  // menganggapnya path relatif dan memuat SatoruStream di dalam pemutar.
  if (url && !isValidPlayerUrl(url)) {
    return (
      <PlayerError message="Sumber mengirimkan tautan pemutar yang tidak valid. Coba pilih server lain di atas, atau ganti sumber bila semua server bermasalah." />
    )
  }

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
    // `key` mengosongkan status error setiap kali server/URL berganti.
    return <DirectVideo key={url} url={url} title={title} />
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

  return loading ? (
    <PlayerMessage icon={<Loader2 className="mx-auto h-8 w-8 animate-spin" />}>
      <p>Memuat server...</p>
    </PlayerMessage>
  ) : (
    <PlayerMessage icon={<Clapperboard className="mx-auto h-8 w-8" />}>
      <p>Server ini tidak mengirimkan tautan pemutar. Coba pilih server lain di atas.</p>
    </PlayerMessage>
  )
}

export default StreamPlayer
