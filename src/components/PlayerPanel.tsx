import React, { useState, useEffect } from 'react';
import { Player, Castle } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import TilePreview from './TilePreview';
import CastleIcon from './CastleIcon';

interface PlayerPanelProps {
  player: Player;
  isCurrentPlayer: boolean;
  isOwnPlayer: boolean;
  onCastleSelect: (castle: Castle) => void;
  onStartingTileSelect: () => void;
  selectedCastle?: Castle;
  hasSelectedStartingTile: boolean;
  selectedTile?: any; // Add selectedTile prop to disable interactions
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isCurrentPlayer,
  isOwnPlayer,
  onCastleSelect,
  onStartingTileSelect,
  selectedCastle,
  hasSelectedStartingTile,
  selectedTile
}) => {
  const [showSpyMode, setShowSpyMode] = useState(false);
  const [keySequence, setKeySequence] = useState('');
  const [spyTimer, setSpyTimer] = useState<NodeJS.Timeout | null>(null);

  const availableCastles = player.castles.filter(castle => !castle.position);
  const placedCastles = player.castles.filter(castle => castle.position);

  // Sort available castles by rank in ascending order (1, 2, 3, 4)
  const sortedAvailableCastles = [...availableCastles].sort((a, b) => a.rank - b.rank);

  // Determine if interactions should be disabled
  const isDisabledDueToTile = !!selectedTile;
  const canInteract = isCurrentPlayer && isOwnPlayer && !isDisabledDueToTile;

  // Listen for keystrokes to detect the spy easter egg sequence
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only capture letters, ignore special keys
      if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
        const newSequence = (keySequence + event.key.toLowerCase()).slice(-3); // Keep only last 3 characters
        setKeySequence(newSequence);
        
        // Check if the sequence ends with 'spy'
        if (newSequence.endsWith('spy')) {
          console.log('🕵️ Spy easter egg activated! Revealing starting tiles for 3 seconds');
          
          // Clear any existing timer
          if (spyTimer) {
            clearTimeout(spyTimer);
          }
          
          // Show spy mode
          setShowSpyMode(true);
          
          // Set timer to hide after 3 seconds
          const timer = setTimeout(() => {
            setShowSpyMode(false);
            console.log('🕵️ Spy mode expired - hiding starting tiles');
          }, 3000);
          
          setSpyTimer(timer);
          
          // Reset sequence
          setKeySequence('');
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyPress);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (spyTimer) {
        clearTimeout(spyTimer);
      }
    };
  }, [keySequence, spyTimer]);

  // Reset sequence after 3 seconds of inactivity
  useEffect(() => {
    if (keySequence.length > 0) {
      const resetTimer = setTimeout(() => {
        setKeySequence('');
      }, 3000);
      
      return () => clearTimeout(resetTimer);
    }
  }, [keySequence]);

  return (
    <Card className={cn(
      "transition-all",
      isCurrentPlayer && "ring-2 ring-blue-500 bg-blue-50",
      isDisabledDueToTile && isOwnPlayer && "opacity-60",
      showSpyMode && !isOwnPlayer && "ring-2 ring-red-400 bg-red-50"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm lg:text-base">
          <span className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 lg:w-4 lg:h-4 rounded-full",
              player.color === 'red' && "bg-red-500",
              player.color === 'blue' && "bg-blue-500",
              player.color === 'yellow' && "bg-yellow-500",
              player.color === 'green' && "bg-green-500"
            )} />
            <span className="truncate">{player.name}</span>
            {isOwnPlayer && <span className="text-xs text-blue-600">(You)</span>}
            {showSpyMode && !isOwnPlayer && (
              <span className="text-xs text-red-600 bg-red-100 px-1 rounded animate-pulse">
                🕵️ SPY
              </span>
            )}
          </span>
          <span className="text-sm font-bold text-yellow-600 flex-shrink-0">
            {player.gold}G
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 pt-0">
        {/* Available Castles */}
        <div>
          <h4 className="text-xs font-semibold mb-2">
            Castles ({sortedAvailableCastles.length})
            {isDisabledDueToTile && isOwnPlayer && (
              <span className="text-red-500 ml-2 block lg:inline">(Place tile first)</span>
            )}
          </h4>
          <div className="flex flex-wrap gap-1 lg:gap-2">
            {sortedAvailableCastles.map(castle => (
              <Button
                key={castle.id}
                variant={selectedCastle?.id === castle.id ? "default" : "outline"}
                size="sm"
                onClick={() => onCastleSelect(castle)}
                disabled={!canInteract}
                className={cn(
                  "h-10 w-10 lg:h-12 lg:w-12 p-1 transition-all",
                  selectedCastle?.id === castle.id && "ring-2 ring-blue-400 bg-blue-600",
                  isDisabledDueToTile && "cursor-not-allowed opacity-50"
                )}
                title={
                  isDisabledDueToTile 
                    ? "Place the drawn tile first" 
                    : selectedCastle?.id === castle.id 
                      ? "Click again to deselect" 
                      : `Select rank ${castle.rank} castle`
                }
              >
                <CastleIcon 
                  rank={castle.rank} 
                  color={castle.color} 
                  size="sm"
                />
              </Button>
            ))}
            {sortedAvailableCastles.length === 0 && (
              <span className="text-xs text-gray-500">None</span>
            )}
          </div>
        </div>

        {/* Starting Tile - Show presence/absence to all, details only to owner OR during spy mode */}
        <div>
          <h4 className="text-xs font-semibold mb-1">
            Starting Tile
            {isDisabledDueToTile && isOwnPlayer && (
              <span className="text-red-500 ml-2 block lg:inline">(Place tile first)</span>
            )}
          </h4>
          {player.startingTile ? (
            <div className="flex items-center gap-2">
              {isOwnPlayer || showSpyMode ? (
                // Show actual tile to owner OR during spy mode
                <>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 flex-shrink-0">
                    <TilePreview 
                      tile={player.startingTile} 
                      className={cn(
                        "w-full h-full text-xs",
                        showSpyMode && !isOwnPlayer && "ring-2 ring-red-400 animate-pulse"
                      )} 
                    />
                  </div>
                  {isOwnPlayer ? (
                    <Button
                      variant={hasSelectedStartingTile ? "default" : "outline"}
                      size="sm"
                      onClick={onStartingTileSelect}
                      disabled={!canInteract}
                      className={cn(
                        "text-xs h-6 transition-all flex-shrink-0",
                        hasSelectedStartingTile && "ring-2 ring-blue-400",
                        isDisabledDueToTile && "cursor-not-allowed opacity-50"
                      )}
                      title={isDisabledDueToTile ? "Place the drawn tile first" : "Select starting tile"}
                    >
                      Place
                    </Button>
                  ) : (
                    <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded font-medium animate-pulse">
                      🕵️ Revealed!
                    </div>
                  )}
                </>
              ) : (
                // Show hidden tile to other players (when not in spy mode)
                <>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 border-2 border-blue-300 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-blue-700 font-bold">?</span>
                  </div>
                  <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded font-medium">
                    Has Tile
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-200 border-2 border-dashed border-gray-300 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-gray-500">✓</span>
              </div>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {isOwnPlayer ? "Already played" : "Played"}
              </div>
            </div>
          )}
        </div>

        {/* Placed Castles Count */}
        <div className="text-xs text-gray-600">
          Placed: {placedCastles.length} castles
        </div>

        {/* Selection Status - Only show for own player */}
        {isOwnPlayer && isCurrentPlayer && (
          <div className="text-xs">
            {selectedTile && (
              <div className="text-blue-600 font-semibold">
                📋 Tile drawn - place it on the board
              </div>
            )}
            {selectedCastle && !selectedTile && (
              <div className="text-green-600 font-semibold">
                🏰 Castle selected - click board to place
              </div>
            )}
            {hasSelectedStartingTile && !selectedTile && (
              <div className="text-purple-600 font-semibold">
                🎯 Starting tile ready - click board to place
              </div>
            )}
            {!selectedCastle && !selectedTile && !hasSelectedStartingTile && (
              <div className="text-gray-500">
                Choose an action for your turn
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerPanel;