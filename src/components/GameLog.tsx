import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameState } from '@/types/game';
import { Clock, User } from 'lucide-react';

interface LogEntry {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  action: string;
  timestamp: number;
  epoch: number;
}

interface GameLogProps {
  gameState: GameState;
}

const GameLog: React.FC<GameLogProps> = ({ gameState }) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const logEntries = gameState.gameLog || [];

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logEntries.length]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPlayerColorClass = (color: string) => {
    switch (color) {
      case 'red': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
      case 'blue': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
      case 'yellow': return 'text-yellow-700 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30';
      case 'green': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const groupedEntries = logEntries.reduce((groups: { [key: number]: LogEntry[] }, entry) => {
    if (!groups[entry.epoch]) {
      groups[entry.epoch] = [];
    }
    groups[entry.epoch].push(entry);
    return groups;
  }, {});

  return (
    <Card className="h-80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Game Log
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          {logEntries.length} actions • Epoch {gameState.epoch}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 h-64">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-3 space-y-3">
            {Object.keys(groupedEntries).length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <User className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No actions yet</p>
                <p className="text-xs opacity-75">Player actions will appear here</p>
              </div>
            ) : (
              Object.entries(groupedEntries)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([epoch, entries]) => (
                  <div key={epoch} className="space-y-2">
                    {/* Epoch Header */}
                    <div className="sticky top-0 bg-muted px-2 py-1 rounded text-xs font-semibold text-foreground border border-border z-10">
                      📜 Epoch {epoch}
                    </div>
                    
                    {/* Log Entries for this Epoch */}
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors"
                      >
                        {/* Player Color Indicator */}
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          entry.playerColor === 'red' ? 'bg-red-500' :
                          entry.playerColor === 'blue' ? 'bg-blue-500' :
                          entry.playerColor === 'yellow' ? 'bg-yellow-500' :
                          entry.playerColor === 'green' ? 'bg-green-500' :
                          'bg-muted-foreground'
                        }`} />
                        
                        {/* Log Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs">
                            <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${getPlayerColorClass(entry.playerColor)}`}>
                              {entry.playerName}
                            </span>
                            <span className="ml-1 text-foreground text-xs">
                              {entry.action}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatTime(entry.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default GameLog;