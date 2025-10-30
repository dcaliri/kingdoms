import React from 'react';
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
  const availableCastles = player.castles.filter(castle => !castle.position);
  const placedCastles = player.castles.filter(castle => castle.position);

  // Sort available castles by rank in ascending order (1, 2, 3, 4)
  const sortedAvailableCastles = [...availableCastles].sort((a, b) => a.rank - b.rank);

  // Determine if interactions should be disabled
  const isDisabledDueToTile = !!selectedTile;
  const canInteract = isCurrentPlayer && isOwnPlayer && !isDisabledDueToTile;

  return (
    <Card className={cn(
      "transition-all",
      isCurrentPlayer && "ring-2 ring-blue-500 bg-blue-50",
      isDisabledDueToTile && isOwnPlayer && "opacity-60"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              player.color === 'red' && "bg-red-500",
              player.color === 'blue' && "bg-blue-500",
              player.color === 'yellow' && "bg-yellow-500",
              player.color === 'green' && "bg-green-500"
            )} />
            {player.name}
            {isOwnPlayer && <span className="text-xs text-blue-600">(You)</span>}
          </span>
          <span className="text-sm font-bold text-yellow-600">
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
              <span className="text-red-500 ml-2">(Place tile first)</span>
            )}
          </h4>
          <div className="flex flex-wrap gap-2">
            {sortedAvailableCastles.map(castle => (
              <Button
                key={castle.id}
                variant={selectedCastle?.id === castle.id ? "default" : "outline"}
                size="sm"
                onClick={() => onCastleSelect(castle)}
                disabled={!canInteract}
                className={cn(
                  "h-12 w-12 p-1 transition-all",
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

        {/* Starting Tile - Only show for own player */}
        {isOwnPlayer && (
          <div>
            <h4 className="text-xs font-semibold mb-1">
              Starting Tile
              {isDisabledDueToTile && (
                <span className="text-red-500 ml-2">(Place tile first)</span>
              )}
            </h4>
            {player.startingTile ? (
              <div className="flex items-center gap-2">
                <div className="w-12 h-12">
                  <TilePreview tile={player.startingTile} className="w-12 h-12 text-xs" />
                </div>
                <Button
                  variant={hasSelectedStartingTile ? "default" : "outline"}
                  size="sm"
                  onClick={onStartingTileSelect}
                  disabled={!canInteract}
                  className={cn(
                    "text-xs h-6 transition-all",
                    hasSelectedStartingTile && "ring-2 ring-blue-400",
                    isDisabledDueToTile && "cursor-not-allowed opacity-50"
                  )}
                  title={isDisabledDueToTile ? "Place the drawn tile first" : "Select starting tile"}
                >
                  Place
                </Button>
              </div>
            ) : (
              <span className="text-xs text-gray-500">None</span>
            )}
          </div>
        )}

        {/* Placed Castles Count */}
        <div className="text-xs text-gray-600">
          Placed: {placedCastles.length} castles
        </div>

        {/* Selection Status */}
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