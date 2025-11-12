import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GameState, Player, Tile } from '@/types/game';
import { canPlayerAct } from '@/utils/gameLogic';
import TilePreview from './TilePreview';
import { LogOut, Square, AlertCircle, Shuffle } from 'lucide-react';

interface GameActionsProps {
  gameState: GameState;
  currentPlayer: Player;
  onDrawTile: () => void;
  onPass: () => void;
  onAbandonGame: () => void;
  onEndGame: () => void;
  onSwapTiles?: () => void; // New prop for tile swapping
  selectedCastle?: any;
  selectedTile?: Tile;
  hasSelectedStartingTile: boolean;
  isSwapping?: boolean; // Track if swap is in progress to prevent race conditions
  playerId: string;
}

const GameActions: React.FC<GameActionsProps> = ({
  gameState,
  currentPlayer,
  onDrawTile,
  onPass,
  onAbandonGame,
  onEndGame,
  onSwapTiles,
  selectedCastle,
  selectedTile,
  hasSelectedStartingTile,
  isSwapping = false, // Default to false if not provided
  playerId
}) => {
  const canAct = canPlayerAct(currentPlayer, gameState);
  const hasEmptySpaces = gameState.board.some(row => row.some(cell => cell === null));
  const hasTilesInSupply = gameState.tileSupply.length > 0;
  const isMyTurn = currentPlayer?.id === playerId;
  const ownPlayer = gameState.players.find(p => p.id === playerId);
  const isHost = ownPlayer && gameState.players[0]?.id === ownPlayer.id; // First player is considered host
  
  // Check if tile swap variant is active
  const isTileSwapVariant = gameState.variant === 'tile-swap';
  
  // Check if player can swap tiles (has both drawn tile and starting tile, and not already swapping)
  const canSwapTiles = isTileSwapVariant && selectedTile && currentPlayer.startingTile && isMyTurn && !isSwapping;

  // Determine if tile drawing should be disabled
  const canDrawTile = hasTilesInSupply && hasEmptySpaces && !selectedTile && isMyTurn;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Actions
          {isTileSwapVariant && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
              🔄 Tile Swap
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground mb-4">
          Choose an action for your turn:
        </div>

        {/* Game Actions */}
        <Button
          onClick={onDrawTile}
          disabled={!canDrawTile}
          className="w-full"
          variant="outline"
        >
          Draw & Place Tile
          <span className="ml-2 text-xs">
            ({gameState.tileSupply.length} tiles left)
          </span>
        </Button>

        {/* Tile Swap Action - Only show in tile swap variant */}
        {isTileSwapVariant && selectedTile && currentPlayer.startingTile && isMyTurn && onSwapTiles && (
          <Button
            onClick={onSwapTiles}
            disabled={isSwapping}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            variant="default"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            {isSwapping ? 'Swapping...' : 'Swap with Starting Tile'}
          </Button>
        )}

        {/* Show restriction message if tile already drawn */}
        {selectedTile && (
          <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2">
              <AlertCircle className="h-4 w-4" />
              {isTileSwapVariant ? 'Choose your action' : 'Tile must be placed first'}
            </div>
            <div className="text-sm text-primary/90 mb-2">
              {isTileSwapVariant ? (
                <>You drew a tile. You can:</>
              ) : (
                <>You drew a tile and must place it before taking other actions:</>
              )}
            </div>
            <div className="flex justify-center mb-2">
              <TilePreview tile={selectedTile} />
            </div>
            
            {isTileSwapVariant ? (
              <div className="text-xs text-primary space-y-1">
                <div>• Click an empty space on the board to place this tile</div>
                {currentPlayer.startingTile && (
                  <div>• OR click "Swap with Starting Tile" to exchange them</div>
                )}
              </div>
            ) : (
              <div className="text-xs text-primary mt-2 text-center">
                Click an empty space on the board to place it
              </div>
            )}
          </div>
        )}

        {/* Show current selection status */}
        {!selectedTile && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• Select a castle from your panel, then click an empty board space</div>
            <div>• Click "Draw & Place Tile" to randomly draw a tile{isTileSwapVariant ? ' (can be swapped)' : ', then place it'}</div>
            <div>• Select your starting tile from your panel, then place it</div>
            {selectedCastle && (
              <div className="text-green-600 dark:text-green-400 font-semibold">
                ✓ Castle selected - click again to deselect, or click board to place
              </div>
            )}
          </div>
        )}

        {!canAct && isMyTurn && !selectedTile && (
          <Button
            onClick={onPass}
            className="w-full"
            variant="destructive"
          >
            Pass Turn
          </Button>
        )}

        <div className="text-xs text-muted-foreground mt-4">
          {selectedCastle && !selectedTile && "Castle selected - click an empty space to place it"}
          {selectedTile && !isTileSwapVariant && "Tile ready - click an empty space to place it"}
          {selectedTile && isTileSwapVariant && "Tile drawn - place it or swap with starting tile"}
          {hasSelectedStartingTile && !selectedTile && "Starting tile selected - click an empty space to place it"}
        </div>

        <Separator className="my-4" />

        {/* Game Management Actions */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground mb-2">Game Management</div>
          
          {/* End Game - Only for host */}
          {isHost && (
            <Button
              onClick={onEndGame}
              variant="outline"
              className="w-full text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
            >
              <Square className="h-4 w-4 mr-2" />
              End Game (Host)
            </Button>
          )}

          {/* Abandon Game - For any player */}
          <Button
            onClick={onAbandonGame}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Abandon Game
          </Button>
        </div>

        <div className="text-xs text-muted-foreground mt-2 space-y-1">
          <div>• <strong>End Game:</strong> Host can end the game and calculate final scores</div>
          <div>• <strong>Abandon Game:</strong> Leave the game (if you're the last player, others win)</div>
          {isTileSwapVariant && (
            <div>• <strong>Tile Swap:</strong> Exchange drawn tiles with your starting tile for strategy</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GameActions;