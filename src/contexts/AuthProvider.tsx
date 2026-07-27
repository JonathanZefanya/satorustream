import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, requireSupabase, supabase } from '../lib/supabase'
import { clearLocalUserData } from '../services/userLibrary'
import { AuthContext, type AuthContextValue } from './authContext'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      return
    }

    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setSession(data.session)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)

      // Wishlist dan riwayat terikat akun; cermin lokalnya dibuang saat keluar
      // agar tidak terbawa ke pengguna berikutnya di perangkat yang sama.
      if (event === 'SIGNED_OUT') {
        clearLocalUserData()
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const client = requireSupabase()
    const { error } = await client.auth.signInWithPassword({ email, password })

    if (error) {
      throw new Error(error.message)
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const client = requireSupabase()
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: displayName ? { data: { display_name: displayName } } : undefined,
    })

    if (error) {
      throw new Error(error.message)
    }

    // Tanpa sesi berarti Supabase menunggu konfirmasi email lebih dulu.
    return { needsConfirmation: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    const client = requireSupabase()
    const { error } = await client.auth.signOut()

    if (error) {
      throw new Error(error.message)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      enabled: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [loading, session, signIn, signOut, signUp],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
