import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { GameState, Player, Tile } from '@/types/game';
import { canPlayerAct } from '@/utils/gameLogic';
import TilePreview from './TilePreview';
import { LogOut, Square, AlertCircle } from 'lucide-react';

interface GameActionsProps {
  gameState: GameState;
  currentPlayer: Player;
  onDrawTile: () => void;
  onPass: () => void;
  onAbandonGame: () => void;
  onEndGame: () => void;
  selectedCastle?: any;
  selectedTile?: Tile;
  hasSelectedStartingTile: boolean;
  playerId: string;
}

const GameActions: React.FC<GameActionsProps> = ({
  gameState,
  currentPlayer,
  onDrawTile,
  onPass,
  onAbandonGame,
  onEndGame,
  selectedCastle,
  selectedTile,
  hasSelectedStartingTile,
  playerId
}) => {
  const canAct = canPlayerAct(currentPlayer, gameState);
  const hasEmptySpaces = gameState.board.some(row => row.some(cell => cell === null));
  const hasTilesInSupply = gameState.tileSupply.length > 0;
  const isMyTurn = currentPlayer?.id === playerId;
  const ownPlayer = gameState.players.find(p => p.id === playerId);
  const isHost = ownPlayer && gameState.players[0]?.id === ownPlayer.id; // First player is considered host

  // Determine if tile drawing should be disabled
  const canDrawTile = hasTilesInSupply && hasEmptySpaces && !selectedTile && isMyTurn;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-gray-600 mb-4">
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

        {/* Show restriction message if tile already drawn */}
        {selectedTile && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800 text-sm font-semibold mb-2">
              <AlertCircle className="h-4 w-4" />
              Tile must be placed first
            </div>
            <div className="text-sm text-blue-700 mb-2">
              You drew a tile and must place it before taking other actions:
            </div>
            <div className="flex justify-center">
              <TilePreview tile={selectedTile} />
            </div>
            <div className="text-xs text-blue-600 mt-2 text-center">
              Click an empty space on the board to place it
            </div>
          </div>
        )}

        {/* Show current selection status */}
        {!selectedTile && (
          <div className="text-xs text-gray-500 space-y-1">
            <div>• Select a castle from your panel, then click an empty board space</div>
            <div>• Click "Draw & Place Tile" to randomly draw a tile, then place it</div>
            <div>• Select your starting tile from your panel, then place it</div>
            {selectedCastle && (
              <div className="text-green-600 font-semibold">
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

        <div className="text-xs text-gray-500 mt-4">
          {selectedCastle && !selectedTile && "Castle selected - click an empty space to place it"}
          {selectedTile && "Tile ready - click an empty space to place it"}
          {hasSelectedStartingTile && !selectedTile && "Starting tile selected - click an empty space to place it"}
        </div>

        <Separator className="my-4" />

        {/* Game Management Actions */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-700 mb-2">Game Management</div>
          
          {/* End Game - Only for host */}
          {isHost && (
            <Button
              onClick={onEndGame}
              variant="outline"
              className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
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

        <div className="text-xs text-gray-500 mt-2 space-y-1">
          <div>• <strong>End Game:</strong> Host can end the game and calculate final scores</div>
          <div>• <strong>Abandon Game:</strong> Leave the game (if you're the last player, others win)</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameActions;