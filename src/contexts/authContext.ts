import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthContextValue {
  /** Sesi aktif, atau null saat pengguna belum masuk. */
  session: Session | null
  user: User | null
  /** True selama sesi awal masih dipulihkan dari storage. */
  loading: boolean
  /** False bila kredensial Supabase belum diisi — fitur akun disembunyikan. */
  enabled: boolean
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string, displayName?: string): Promise<{ needsConfirmation: boolean }>
  signOut(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>.')
  }

  return context
}
