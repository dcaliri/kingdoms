import React from 'react';
import { Player, Castle } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import TilePreview from './TilePreview';

interface PlayerPanelProps {
  player: Player;
  isCurrentPlayer: boolean;
  isOwnPlayer: boolean; // New prop to check if this is the viewing player
  onCastleSelect: (castle: Castle) => void;
  onStartingTileSelect: () => void;
  selectedCastle?: Castle;
  hasSelectedStartingTile: boolean;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isCurrentPlayer,
  isOwnPlayer,
  onCastleSelect,
  onStartingTileSelect,
  selectedCastle,
  hasSelectedStartingTile
}) => {
  const availableCastles = player.castles.filter(castle => !castle.position);
  const placedCastles = player.castles.filter(castle => castle.position);

  return (
    <Card className={cn(
      "transition-all",
      isCurrentPlayer && "ring-2 ring-blue-500 bg-blue-50"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <div className={cn(
              "w-4 h-4 rounded-full",
              player.color === 'red' && "bg-red-500",
              player.color === 'blue' && "bg-blue-500",
              player.color === 'yellow' && "bg-yellow-500",
              player.color === 'green' && "bg-green-500"
            )} />
            {player.name}
            {isOwnPlayer && <span className="text-xs text-blue-600">(You)</span>}
          </span>
          <span className="text-lg font-bold text-yellow-600">
            {player.gold} Gold
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Available Castles */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Available Castles</h4>
          <div className="flex flex-wrap gap-2">
            {availableCastles.map(castle => (
              <Button
                key={castle.id}
                variant={selectedCastle?.id === castle.id ? "default" : "outline"}
                size="sm"
                onClick={() => onCastleSelect(castle)}
                disabled={!isCurrentPlayer || !isOwnPlayer}
                className="h-8 w-8 p-0"
              >
                {castle.rank}
              </Button>
            ))}
            {availableCastles.length === 0 && (
              <span className="text-xs text-gray-500">No castles available</span>
            )}
          </div>
        </div>

        {/* Placed Castles */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Placed Castles</h4>
          <div className="text-xs text-gray-600">
            {placedCastles.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {placedCastles.map(castle => (
                  <span key={castle.id} className="bg-gray-100 px-2 py-1 rounded">
                    Rank {castle.rank}
                  </span>
                ))}
              </div>
            ) : (
              <span>No castles placed</span>
            )}
          </div>
        </div>

        {/* Starting Tile - Only show for own player */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Starting Tile</h4>
          {isOwnPlayer ? (
            player.startingTile ? (
              <div className="flex items-center gap-3">
                <TilePreview tile={player.startingTile} />
                <Button
                  variant={hasSelectedStartingTile ? "default" : "outline"}
                  size="sm"
                  onClick={onStartingTileSelect}
                  disabled={!isCurrentPlayer}
                  className="text-xs"
                >
                  Place Tile
                </Button>
              </div>
            ) : (
              <span className="text-xs text-gray-500">No starting tile</span>
            )
          ) : (
            <div className="flex items-center gap-3">
              {player.startingTile ? (
                <>
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                    Hidden
                  </div>
                  <span className="text-xs text-gray-500">Has starting tile</span>
                </>
              ) : (
                <span className="text-xs text-gray-500">No starting tile</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerPanel;