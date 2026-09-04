import React, { useEffect, useState } from 'react';
import { LeaderboardEntry, getLeaderboard } from '@/utils/leaderboardManager';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
  limit?: number;
  compact?: boolean;
}

const medalForRank = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}.`;
};

const Leaderboard: React.FC<LeaderboardProps> = ({ limit = 10, compact = false }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    getLeaderboard(limit)
      .then(data => {
        if (mounted) setEntries(data);
      })
      .catch(err => {
        console.error('Failed to load leaderboard:', err);
        if (mounted) setError(true);
      });

    return () => {
      mounted = false;
    };
  }, [limit]);

  return (
    <Card className={cn("w-full h-full flex flex-col", compact && "shadow-sm")}>
      <CardHeader className={cn("flex flex-row items-center gap-2", compact && "py-3 px-4")}>
        <Trophy className="h-5 w-5 text-yellow-500" />
        <CardTitle className={cn("text-lg", compact && "text-base")}>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className={cn("flex-1 min-h-0 overflow-y-auto", compact && "px-4 pb-4 pt-0")}>
        {error && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Couldn't load the leaderboard right now.
          </p>
        )}

        {!entries && !error && (
          <div className="space-y-2">
            {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}

        {entries && entries.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No games recorded yet. Log in with Google and play a match to appear here!
          </p>
        )}

        {entries && entries.length > 0 && (
          <div className="space-y-1.5">
              {entries.map((entry, index) => {
                const rank = index + 1;
                const isMe = user?.id === entry.id;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2",
                      isMe ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"
                    )}
                  >
                    <span className={cn(
                      "w-8 text-sm font-bold text-center shrink-0",
                      rank <= 3 ? "text-base" : "text-muted-foreground"
                    )}>
                      {medalForRank(rank)}
                    </span>

                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={entry.avatarUrl || undefined} alt={entry.displayName} />
                      <AvatarFallback className="text-xs">
                        {entry.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className={cn("truncate font-medium", compact ? "text-sm" : "text-sm")}>
                        {entry.displayName}
                        {isMe && <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">you</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.gamesPlayed} games · {entry.winRate}% win rate
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className={cn("font-bold", compact ? "text-sm" : "text-sm")}>
                        {entry.gamesWon} <span className="text-xs font-normal text-muted-foreground">wins</span>
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                        💰 {entry.totalGold}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;