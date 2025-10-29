import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameState, Player } from '@/types/game';
import { canPlayerAct } from '@/utils/gameLogic';

interface GameActionsProps {
  gameState: GameState;
  currentPlayer: Player;
  onDrawTile: () => void;
  onPass: () => void;
  selectedCastle?: any;
  selectedTile?: any;
  hasSelectedStartingTile: boolean;
}

const GameActions: React.FC<GameActionsProps> = ({
  gameState,
  currentPlayer,
  onDrawTile,
  onPass,
  selectedCastle,
  selectedTile,
  hasSelectedStartingTile
}) => {
  const canAct = canPlayerAct(currentPlayer, gameState);
  const hasEmptySpaces = gameState.board.some(row => row.some(cell => cell === null));
  const hasTilesInSupply = gameState.tileSupply.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-gray-600 mb-4">
          Choose an action for your turn:
        </div>

        <Button
          onClick={onDrawTile}
          disabled={!hasTilesInSupply || !hasEmptySpaces}
          className="w-full"
          variant="outline"
        >
          Draw & Place Tile
          <span className="ml-2 text-xs">
            ({gameState.tileSupply.length} tiles left)
          </span>
        </Button>

        <div className="text-xs text-gray-500 space-y-1">
          <div>• Select a castle from your panel, then click an empty board space</div>
          <div>• Click "Draw & Place Tile" to randomly draw a tile, then place it</div>
          <div>• Select your starting tile from your panel, then place it</div>
        </div>

        {!canAct && (
          <Button
            onClick={onPass}
            className="w-full"
            variant="destructive"
          >
            Pass Turn
          </Button>
        )}

        <div className="text-xs text-gray-500 mt-4">
          {selectedCastle && "Castle selected - click an empty space to place it"}
          {selectedTile && "Tile ready - click an empty space to place it"}
          {hasSelectedStartingTile && "Starting tile selected - click an empty space to place it"}
        </div>
      </CardContent>
    </Card>
  );
};

export default GameActions;