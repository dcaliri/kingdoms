import React from 'react';
import { Player, Castle } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import TilePreview from './TilePreview';

interface PlayerPanelProps {
  player: Player;
  isCurrentPlayer: boolean;
  isOwnPlayer: boolean;
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

  // Sort available castles by rank in ascending order (1, 2, 3, 4)
  const sortedAvailableCastles = [...availableCastles].sort((a, b) => a.rank - b.rank);

  return (
    <Card className={cn(
      "transition-all",
      isCurrentPlayer && "ring-2 ring-blue-500 bg-blue-50"
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
          <h4 className="text-xs font-semibold mb-1">Castles ({sortedAvailableCastles.length})</h4>
          <div className="flex flex-wrap gap-1">
            {sortedAvailableCastles.map(castle => (
              <Button
                key={castle.id}
                variant={selectedCastle?.id === castle.id ? "default" : "outline"}
                size="sm"
                onClick={() => onCastleSelect(castle)}
                disabled={!isCurrentPlayer || !isOwnPlayer}
                className="h-6 w-6 p-0 text-xs"
              >
                {castle.rank}
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
            <h4 className="text-xs font-semibold mb-1">Starting Tile</h4>
            {player.startingTile ? (
              <div className="flex items-center gap-2">
                <div className="w-12 h-12">
                  <TilePreview tile={player.startingTile} className="w-12 h-12 text-xs" />
                </div>
                <Button
                  variant={hasSelectedStartingTile ? "default" : "outline"}
                  size="sm"
                  onClick={onStartingTileSelect}
                  disabled={!isCurrentPlayer}
                  className="text-xs h-6"
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
      </CardContent>
    </Card>
  );
};

export default PlayerPanel;