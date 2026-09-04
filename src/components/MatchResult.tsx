import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getPlayerStats, getPlayerRank, LeaderboardEntry } from '@/utils/leaderboardManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface MatchResultProps {
  roomId?: string;
}

interface PlayerProgress extends LeaderboardEntry {
  rank: number | null;
}

const MatchResult: React.FC<MatchResultProps> = () => {
  const { user, signInWithGoogle } = useAuth();
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    let attempts = 0;

    const load = async () => {
      setLoading(true);
      try {
        const [playerStats, rank] = await Promise.all([
          getPlayerStats(user.id),
          getPlayerRank(user.id)
        ]);

        if (!mounted) return;

        if (playerStats) {
          setProgress({ ...playerStats, rank });
        } else if (attempts < 3) {
          // Server may still be processing the match result — retry briefly
          attempts += 1;
          setTimeout(load, 1200);
          return;
        } else {
          setProgress(null);
        }
      } catch (error) {
        console.error('Failed to load player stats:', error);
        if (mounted) setProgress(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [user]);

  if (!user) {
    return (
      <Card className="w-full">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold mb-1">Track your stats</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Log in with Google to record this match and climb the leaderboard.
          </p>
          <Button
            onClick={() => {
              signInWithGoogle().catch(err => {
                toast.error('Failed to sign in with Google');
                console.error('Google sign-in error:', err);
              });
            }}
            className="w-full"
          >
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-5">
        <h3 className="text-lg font-semibold mb-3">Your Progress</h3>
        {loading && !progress ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : progress ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Global rank</span>
              <span className="text-2xl font-bold text-primary">
                #{progress.rank ?? '—'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{progress.gamesPlayed}</p>
                <p className="text-xs text-muted-foreground">Games</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{progress.gamesWon}</p>
                <p className="text-xs text-muted-foreground">Wins</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{progress.winRate}%</p>
                <p className="text-xs text-muted-foreground">Win rate</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {progress.totalGold}
                </p>
                <p className="text-xs text-muted-foreground">Total gold</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{progress.bestStreak}</p>
                <p className="text-xs text-muted-foreground">Best streak</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{progress.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Current streak</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            This match hasn't been recorded yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchResult;