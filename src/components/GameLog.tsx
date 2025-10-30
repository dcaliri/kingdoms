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
      case 'red': return 'text-red-600 bg-red-50';
      case 'blue': return 'text-blue-600 bg-blue-50';
      case 'yellow': return 'text-yellow-700 bg-yellow-50';
      case 'green': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Game Log
        </CardTitle>
        <div className="text-xs text-gray-500">
          {logEntries.length} actions • Epoch {gameState.epoch}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-96" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {Object.keys(groupedEntries).length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No actions yet</p>
                <p className="text-xs">Player actions will appear here</p>
              </div>
            ) : (
              Object.entries(groupedEntries)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([epoch, entries]) => (
                  <div key={epoch} className="space-y-2">
                    {/* Epoch Header */}
                    <div className="sticky top-0 bg-gray-100 px-2 py-1 rounded text-xs font-semibold text-gray-700 border">
                      📜 Epoch {epoch}
                    </div>
                    
                    {/* Log Entries for this Epoch */}
                    {entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-white border border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        {/* Player Color Indicator */}
                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                          entry.playerColor === 'red' ? 'bg-red-500' :
                          entry.playerColor === 'blue' ? 'bg-blue-500' :
                          entry.playerColor === 'yellow' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        
                        {/* Log Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            <span className={`font-semibold px-2 py-0.5 rounded text-xs ${getPlayerColorClass(entry.playerColor)}`}>
                              {entry.playerName}
                            </span>
                            <span className="ml-2 text-gray-700">
                              {entry.action}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
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