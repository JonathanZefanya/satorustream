import { useState } from 'react'
import { getStreamServer } from '../../services/api'
import type { StreamServer } from '../../types/anime'

export const DEFAULT_SERVER_KEY = 'default'

/**
 * Pilihan server streaming untuk satu episode: server yang dipilih, URL
 * pemutar yang sudah diselesaikan per server, dan status pemuatannya.
 */
export const useStreamServers = (endpoint: string, defaultUrl: string | undefined, servers: StreamServer[]) => {
  const [selectedServerKey, setSelectedServerKey] = useState<string>(DEFAULT_SERVER_KEY)
  const [serverUrls, setServerUrls] = useState<Record<string, string>>({})
  const [serverLoading, setServerLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Reset pilihan server setiap ganti episode. Disesuaikan saat render (bukan
  // di effect) supaya tidak memicu render berantai.
  const [renderedEndpoint, setRenderedEndpoint] = useState(endpoint)
  if (renderedEndpoint !== endpoint) {
    setRenderedEndpoint(endpoint)
    setSelectedServerKey(DEFAULT_SERVER_KEY)
    setServerUrls({})
    setServerError(null)
  }

  const pickServer = async (server: StreamServer | null) => {
    setServerError(null)

    if (!server) {
      setSelectedServerKey(DEFAULT_SERVER_KEY)
      return
    }

    setSelectedServerKey(server.serverId)

    if (serverUrls[server.serverId]) {
      return
    }

    setServerLoading(true)

    try {
      const url = await getStreamServer(server)
      setServerUrls((previous) => ({ ...previous, [server.serverId]: url }))
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Gagal memuat server ini.')
    } finally {
      setServerLoading(false)
    }
  }

  const activePlayerUrl =
    (selectedServerKey === DEFAULT_SERVER_KEY ? defaultUrl : serverUrls[selectedServerKey]) || null

  const activeSourceLabel =
    selectedServerKey === DEFAULT_SERVER_KEY
      ? 'Default Stream'
      : (servers.find((server) => server.serverId === selectedServerKey)?.title ?? 'Server')

  return {
    selectedServerKey,
    serverLoading,
    serverError,
    pickServer,
    activePlayerUrl,
    activeSourceLabel,
  }
}
