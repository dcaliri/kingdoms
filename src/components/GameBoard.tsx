import React from 'react';
import { Castle, Tile, GameState } from '@/types/game';
import { cn } from '@/lib/utils';
import { BOARD_ROWS, BOARD_COLS } from '@/utils/gameLogic';
import CastleIcon from './CastleIcon';

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
          "aspect-square border-2 border-gray-300 flex items-center justify-center text-sm font-bold cursor-pointer transition-all hover:shadow-lg",
          isEmpty && "bg-gray-50 hover:bg-gray-100",
          canPlace && "border-blue-400 bg-blue-50 hover:bg-blue-100 ring-2 ring-blue-200",
          !isEmpty && "bg-white shadow-md hover:shadow-lg"
        )}
        onClick={() => onCellClick(row, col)}
      >
        {cell && (
          <div className="w-full h-full flex flex-col items-center justify-center p-3">
            {'rank' in cell ? (
              // Castle - use the new CastleIcon component
              <CastleIcon 
                rank={cell.rank} 
                color={cell.color} 
                size="lg"
                className="drop-shadow-md"
              />
            ) : (
              // Tile
              <div className={cn(
                "w-full h-full flex flex-col items-center justify-center rounded-lg text-center shadow-sm border overflow-hidden relative",
                cell.type === 'resource' && "bg-green-200 border-green-300",
                cell.type === 'hazard' && "bg-red-200 border-red-300",
                cell.type === 'mountain' && "bg-gray-400 border-gray-500",
                cell.type === 'dragon' && "bg-purple-500 border-purple-600",
                cell.type === 'goldmine' && "bg-yellow-400 border-yellow-500",
                cell.type === 'wizard' && "bg-indigo-400 border-indigo-500"
              )}>
                <img 
                  src={cell.imagePath} 
                  alt={`Tile value ${cell.value}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-xl border-2 border-gray-200">
      <div className="grid grid-cols-6 gap-3 w-full">
        {Array.from({ length: BOARD_ROWS }, (_, row) =>
          Array.from({ length: BOARD_COLS }, (_, col) => renderCell(row, col))
        )}
      </div>
      
      <div className="mt-6 text-center">
        <div className="text-xl text-gray-700 font-semibold">
          Epoch {gameState.epoch} of 3
        </div>
        <div className="text-base text-gray-600 mt-2">
          Current Player: <span className="font-semibold text-blue-600">{gameState.players[gameState.currentPlayerIndex].name}</span>
        </div>
        {(selectedCastle || selectedTile) && (
          <div className="text-base text-blue-600 mt-3 font-medium bg-blue-50 p-3 rounded-lg border border-blue-200">
            Click an empty space to place your {selectedCastle ? 'castle' : 'tile'}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;