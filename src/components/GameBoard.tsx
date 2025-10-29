import React from 'react';
import { Castle, Tile, GameState } from '@/types/game';
import { cn } from '@/lib/utils';
import { BOARD_ROWS, BOARD_COLS } from '@/utils/gameLogic';

interface GameBoardProps {
  gameState: GameState;
  onCellClick: (row: number, col: number) => void;
  selectedCastle?: Castle;
  selectedTile?: Tile;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onCellClick,
  selectedCastle,
  selectedTile
}) => {
  const renderCell = (row: number, col: number) => {
    const cell = gameState.board[row][col];
    const isEmpty = cell === null;
    const canPlace = isEmpty && (selectedCastle || selectedTile);

    return (
      <div
        key={`${row}-${col}`}
        className={cn(
          "aspect-square border-2 border-gray-300 flex items-center justify-center text-sm font-bold cursor-pointer transition-all hover:shadow-md",
          isEmpty && "bg-gray-50 hover:bg-gray-100",
          canPlace && "border-blue-400 bg-blue-50 hover:bg-blue-100 ring-2 ring-blue-200",
          !isEmpty && "bg-white shadow-sm"
        )}
        onClick={() => onCellClick(row, col)}
      >
        {cell && (
          <div className="w-full h-full flex flex-col items-center justify-center p-2">
            {'rank' in cell ? (
              // Castle
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md",
                cell.color === 'red' && "bg-red-500",
                cell.color === 'blue' && "bg-blue-500",
                cell.color === 'yellow' && "bg-yellow-500",
                cell.color === 'green' && "bg-green-500"
              )}>
                {cell.rank}
              </div>
            ) : (
              // Tile
              <div className={cn(
                "w-full h-full flex flex-col items-center justify-center rounded text-center shadow-sm",
                cell.type === 'resource' && "bg-green-200 text-green-800",
                cell.type === 'hazard' && "bg-red-200 text-red-800",
                cell.type === 'mountain' && "bg-gray-400 text-white",
                cell.type === 'dragon' && "bg-purple-500 text-white",
                cell.type === 'goldmine' && "bg-yellow-400 text-yellow-900",
                cell.type === 'wizard' && "bg-indigo-400 text-white"
              )}>
                <div className="text-xs font-semibold leading-tight mb-1">
                  {cell.name}
                </div>
                {cell.value !== 0 && (
                  <div className="text-sm font-bold">
                    {cell.value > 0 ? '+' : ''}{cell.value}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="grid grid-cols-6 gap-2 w-full max-w-3xl mx-auto">
        {Array.from({ length: BOARD_ROWS }, (_, row) =>
          Array.from({ length: BOARD_COLS }, (_, col) => renderCell(row, col))
        )}
      </div>
      
      <div className="mt-4 text-center">
        <div className="text-lg text-gray-700 font-semibold">
          Epoch {gameState.epoch} of 3
        </div>
        <div className="text-sm text-gray-600 mt-1">
          Current Player: {gameState.players[gameState.currentPlayerIndex].name}
        </div>
        {(selectedCastle || selectedTile) && (
          <div className="text-sm text-blue-600 mt-2 font-medium">
            Click an empty space to place your {selectedCastle ? 'castle' : 'tile'}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;