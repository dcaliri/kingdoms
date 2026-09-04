import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  gamesPlayed: number;
  gamesWon: number;
  totalGold: number;
  currentStreak: number;
  bestStreak: number;
  winRate: number;
}

export interface MatchResult {
  playerId: string;
  playerName: string;
  goldFinal: number;
  placement: number;
  epoch: number;
  variant: string;
}

interface StatsRow {
  id: string;
  games_played: number;
  games_won: number;
  total_gold: number;
  current_streak: number;
  best_streak: number;
  profiles: { display_name: string; avatar_url: string | null } | { display_name: string; avatar_url: string | null }[] | null;
}

// Supabase Auth user ids are UUIDs; anonymous players use generated ids.
export const isAuthPlayerId = (playerId: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId);
};

const mapRowToEntry = (row: StatsRow): LeaderboardEntry => {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    displayName: profile?.display_name || 'Unknown',
    avatarUrl: profile?.avatar_url || null,
    gamesPlayed: row.games_played,
    gamesWon: row.games_won,
    totalGold: row.total_gold,
    currentStreak: row.current_streak,
    bestStreak: row.best_streak,
    winRate: row.games_played > 0 ? Math.round((row.games_won / row.games_played) * 100) : 0
  };
};

// Creates/updates the user's profile and ensures their stats row exists.
export const ensureProfile = async (user: User): Promise<void> => {
  const displayName =
    (user.user_metadata?.name as string) ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split('@')[0] ||
    'Player';
  const avatarUrl =
    (user.user_metadata?.avatar_url as string) ||
    (user.user_metadata?.picture as string) ||
    null;

  const { error } = await supabase.rpc('upsert_profile', {
    p_id: user.id,
    p_display_name: displayName,
    p_avatar_url: avatarUrl
  });

  if (error) {
    console.error('Failed to ensure profile:', error);
    throw error;
  }
};

// Records a finished match. Only UUID player ids (authenticated users) are sent;
// the DB dedupes on (room_id, player_id) so repeated browsers don't double-count.
export const saveMatchResults = async (roomId: string, results: MatchResult[]): Promise<void> => {
  const validResults = results.filter(r => isAuthPlayerId(r.playerId));
  if (validResults.length === 0) return;

  try {
    const { error } = await supabase.rpc('record_match', {
      p_room_id: roomId,
      p_results: validResults.map(r => ({
        player_id: r.playerId,
        player_name: r.playerName,
        gold_final: r.goldFinal,
        placement: r.placement,
        epoch: r.epoch,
        variant: r.variant
      }))
    });

    if (error) {
      console.error('Failed to record match results:', error);
    }
  } catch (error) {
    console.error('Failed to record match results:', error);
  }
};

export const getLeaderboard = async (limit = 20): Promise<LeaderboardEntry[]> => {
  const { data, error } = await supabase
    .from('player_stats')
    .select('id, games_played, games_won, total_gold, current_streak, best_streak, profiles(display_name, avatar_url)')
    .order('games_won', { ascending: false })
    .order('total_gold', { ascending: false })
    .order('best_streak', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch leaderboard:', error);
    throw error;
  }

  return (data as unknown as StatsRow[] | null)?.map(mapRowToEntry) ?? [];
};

export const getPlayerStats = async (userId: string): Promise<LeaderboardEntry | null> => {
  const { data, error } = await supabase
    .from('player_stats')
    .select('id, games_played, games_won, total_gold, current_streak, best_streak, profiles(display_name, avatar_url)')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return mapRowToEntry(data as unknown as StatsRow);
};

// Computes the player's global rank (1-based) from the same ordering as the leaderboard.
export const getPlayerRank = async (userId: string): Promise<number | null> => {
  const lead = await getLeaderboard(500);
  const idx = lead.findIndex(entry => entry.id === userId);
  return idx === -1 ? null : idx + 1;
};