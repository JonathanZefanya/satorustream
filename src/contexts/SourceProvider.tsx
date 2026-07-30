import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DEV_ONLY_SOURCE_IDS,
  getActiveSource,
  getActiveSourceId,
  SELECTABLE_SOURCE_IDS,
  setActiveSourceId,
  SOURCES,
} from '../services/sources'
import { SourceContext, type SourceContextValue } from './sourceContext'

interface SourceProviderProps {
  children: ReactNode
}

/**
 * Sumber khusus dev sudah tersaring, jadi pemilih di produksi tidak memuatnya.
 * Yang lolos hanya karena mode dev diberi penanda supaya jelas bahwa sumber itu
 * tidak akan ikut tampil setelah di-deploy.
 */
const OPTIONS = SELECTABLE_SOURCE_IDS.map((id) => ({
  id,
  label: DEV_ONLY_SOURCE_IDS.includes(id) ? `${SOURCES[id].label} (dev)` : SOURCES[id].label,
}))

export const SourceProvider = ({ children }: SourceProviderProps) => {
  const navigate = useNavigate()
  const [sourceId, setSourceIdState] = useState(getActiveSourceId)

  const setSourceId = useCallback(
    (nextId: string) => {
      if (nextId === sourceId) {
        return
      }

      const applied = setActiveSourceId(nextId)
      setSourceIdState(applied)

      // Slug anime hanya berlaku di sumber asalnya, jadi halaman detail atau
      // tonton yang sedang dibuka pasti tidak valid setelah berganti sumber.
      navigate('/', { replace: true })
    },
    [navigate, sourceId],
  )

  const value = useMemo<SourceContextValue>(() => {
    const source = getActiveSource()

    return {
      sourceId,
      source,
      capabilities: source.capabilities,
      options: OPTIONS,
      setSourceId,
    }
  }, [setSourceId, sourceId])

  return <SourceContext.Provider value={value}>{children}</SourceContext.Provider>
}
