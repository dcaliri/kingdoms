-- =============================================================================
-- Kingdoms: Auth Profiles + Leaderboard + Match History
-- Run this in the Supabase SQL Editor.
-- PREREQUISITE: Enable Google OAuth in Dashboard > Authentication > Providers.
-- =============================================================================

-- 1) profiles ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2) match_history ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    gold_final INTEGER NOT NULL DEFAULT 0,
    placement INTEGER,
    epoch INTEGER,
    variant TEXT,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- A player's result can only be recorded once per room (dedupes multiple browsers)
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_history_room_player
    ON public.match_history(room_id, player_id);

-- 3) player_stats -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_stats (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    games_played INTEGER NOT NULL DEFAULT 0,
    games_won INTEGER NOT NULL DEFAULT 0,
    total_gold INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS -------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- profiles: anyone can read; a user can only manage their own row
CREATE POLICY "profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);
CREATE POLICY "users can manage their own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- match_history: read-only for everyone (writes go through record_match SECURITY DEFINER fn)
CREATE POLICY "match_history is viewable by everyone" ON public.match_history
    FOR SELECT USING (true);

-- player_stats: read-only for everyone (writes go through record_match SECURITY DEFINER fn)
CREATE POLICY "player_stats is viewable by everyone" ON public.player_stats
    FOR SELECT USING (true);

-- =============================================================================
-- Functions (SECURITY DEFINER so writes bypass RLS on match_history/player_stats)
-- =============================================================================

-- Upsert a user's profile and make sure their stats row exists
CREATE OR REPLACE FUNCTION public.upsert_profile(
    p_id UUID,
    p_display_name TEXT,
    p_avatar_url TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (p_id, p_display_name, p_avatar_url)
    ON CONFLICT (id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = timezone('utc'::text, now());

    INSERT INTO public.player_stats (id)
    VALUES (p_id)
    ON CONFLICT (id) DO NOTHING;
END;
$$;

ALTER FUNCTION public.upsert_profile(UUID, TEXT, TEXT) OWNER TO postgres;

-- Record the results of a finished match and update stats.
-- p_results: JSONB array of {
--   player_id: uuid, player_name: text, gold_final: int,
--   placement: int (1 = winner), epoch: int, variant: text
-- }
CREATE OR REPLACE FUNCTION public.record_match(
    p_room_id UUID,
    p_results JSONB
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    r RECORD;
    v_inserted UUID;
BEGIN
    FOR r IN SELECT * FROM jsonb_to_recordset(p_results) AS x(
        player_id UUID,
        player_name TEXT,
        gold_final INTEGER,
        placement INTEGER,
        epoch INTEGER,
        variant TEXT
    )
    LOOP
        INSERT INTO public.match_history (
            room_id, player_id, player_name, gold_final, placement, epoch, variant
        )
        VALUES (
            p_room_id, r.player_id, r.player_name, r.gold_final, r.placement, r.epoch, r.variant
        )
        ON CONFLICT (room_id, player_id) DO NOTHING
        RETURNING id INTO v_inserted;

        IF v_inserted IS NOT NULL THEN
            UPDATE public.player_stats
            SET games_played = games_played + 1,
                games_won = games_won + CASE WHEN r.placement = 1 THEN 1 ELSE 0 END,
                total_gold = total_gold + r.gold_final,
                current_streak = CASE WHEN r.placement = 1 THEN current_streak + 1 ELSE 0 END,
                best_streak = GREATEST(
                    best_streak,
                    CASE WHEN r.placement = 1 THEN current_streak + 1 ELSE current_streak END
                ),
                updated_at = timezone('utc'::text, now())
            WHERE id = r.player_id;
        END IF;
    END LOOP;
END;
$$;

ALTER FUNCTION public.record_match(UUID, JSONB) OWNER TO postgres;

-- Indexes ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_match_history_player_id ON public.match_history(player_id);
CREATE INDEX IF NOT EXISTS idx_match_history_played_at ON public.match_history(played_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_stats_wins ON public.player_stats(games_won DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_gold ON public.player_stats(total_gold DESC);