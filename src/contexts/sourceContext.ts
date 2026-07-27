import { createContext, useContext } from 'react'
import type { SourceAdapter, SourceCapabilities } from '../services/sources'

export interface SourceContextValue {
  sourceId: string
  source: SourceAdapter
  capabilities: SourceCapabilities
  /** Daftar sumber yang bisa dipilih, sudah berisi id dan labelnya. */
  options: { id: string; label: string }[]
  setSourceId(id: string): void
}

export const SourceContext = createContext<SourceContextValue | null>(null)

export const useSource = (): SourceContextValue => {
  const context = useContext(SourceContext)

  if (!context) {
    throw new Error('useSource harus dipakai di dalam <SourceProvider>.')
  }

  return context
}
