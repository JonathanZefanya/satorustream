import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/**
 * Fitur akun bersifat opsional. Tanpa kredensial Supabase aplikasi tetap jalan
 * penuh sebagai tamu — wishlist dan riwayat disimpan di localStorage saja.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.info(
    '[satorustream] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. ' +
      'Fitur akun dinonaktifkan; wishlist dan riwayat hanya tersimpan di perangkat ini.',
  )
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/**
 * Dipakai fungsi yang mensyaratkan Supabase aktif. Melempar alih-alih
 * mengembalikan null supaya pemanggilnya tidak diam-diam gagal.
 */
export const requireSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Fitur akun belum dikonfigurasi (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
  }

  return supabase
}
