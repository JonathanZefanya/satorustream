-- ============================================================
-- SATORUSTREAM — Skema data pengguna (auth, wishlist, riwayat)
-- Jalankan di Supabase SQL Editor pada project yang sama dengan superanime.
--
-- Berbeda dari supabase-schema.sql milik superanime yang datanya publik,
-- seluruh tabel di sini bersifat privat per pengguna dan dikunci lewat RLS
-- dengan auth.uid(). Jangan pernah memberi policy "allow public" ke tabel ini.
-- ============================================================

-- 1. PROFIL PENGGUNA
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. WISHLIST
-- source_id wajib: slug anime berbeda antar sumber, jadi judul yang sama di
-- otakudesu dan oploverz adalah dua baris berbeda.
CREATE TABLE IF NOT EXISTS public.watchlist (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id    TEXT NOT NULL,
  anime_slug   TEXT NOT NULL,
  title        TEXT,
  poster       TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, source_id, anime_slug)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user
  ON public.watchlist (user_id, created_at DESC);

-- 3. RIWAYAT TONTON
CREATE TABLE IF NOT EXISTS public.watch_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id      TEXT NOT NULL,
  anime_slug     TEXT,
  episode_slug   TEXT NOT NULL,
  episode_label  TEXT,
  title          TEXT,
  poster         TEXT,
  watched_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, source_id, episode_slug)
);

CREATE INDEX IF NOT EXISTS idx_history_user
  ON public.watch_history (user_id, watched_at DESC);

-- 4. updated_at otomatis untuk profiles
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Profil dibuat otomatis saat pengguna mendaftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auth_user_created ON auth.users;
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. ROW LEVEL SECURITY — tiap pengguna hanya menyentuh barisnya sendiri
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "watchlist_all_own" ON public.watchlist;
CREATE POLICY "watchlist_all_own" ON public.watchlist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "watch_history_all_own" ON public.watch_history;
CREATE POLICY "watch_history_all_own" ON public.watch_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
