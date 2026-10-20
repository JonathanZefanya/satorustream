import { useCallback, useEffect, useState } from 'react'

interface UseAsyncDataOptions<T> {
  enabled?: boolean
  initialData?: T
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncDataOptions<T> = {},
) {
  const { enabled = true, initialData } = options

  const [data, setData] = useState<T | undefined>(initialData)
  const [loading, setLoading] = useState<boolean>(enabled)
  const [error, setError] = useState<string | null>(null)
  const [failure, setFailure] = useState<unknown>(null)

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setFailure(null)

    try {
      const next = await fetcher()
      setData(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error occurred.')
      setFailure(err ?? new Error('Unexpected error occurred.'))
    } finally {
      setLoading(false)
    }
  }, [enabled, fetcher])

  useEffect(() => {
    // The hook intentionally starts or refreshes fetch state whenever dependencies change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  return {
    data,
    loading,
    error,
    failure,
    reload,
    setData,
  }
}