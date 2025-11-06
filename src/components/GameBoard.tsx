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
          "aspect-square border-2 border-border flex items-center justify-center text-sm font-bold cursor-pointer transition-all hover:shadow-lg",
          isEmpty && "bg-muted/30 hover:bg-muted/50",
          canPlace && "border-primary bg-primary/10 hover:bg-primary/20 ring-2 ring-primary/30",
          !isEmpty && "bg-card shadow-md hover:shadow-lg"
        )}
        onClick={() => onCellClick(row, col)}
      >
        {cell && (
          <div className="w-full h-full flex flex-col items-center justify-center p-1 lg:p-3">
            {'rank' in cell ? (
              // Castle - use the new CastleIcon component
              <CastleIcon 
                rank={cell.rank} 
                color={cell.color} 
                size="lg"
                className="drop-shadow-md w-full h-full"
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
    <div className="bg-card p-4 lg:p-8 rounded-xl shadow-xl border-2 border-border w-full">
      <div className="grid grid-cols-6 gap-1 lg:gap-3 w-full max-w-2xl mx-auto">
        {Array.from({ length: BOARD_ROWS }, (_, row) =>
          Array.from({ length: BOARD_COLS }, (_, col) => renderCell(row, col))
        )}
      </div>
      
      <div className="mt-4 lg:mt-6 text-center">
        <div className="text-lg lg:text-xl text-foreground font-semibold">
          Epoch {gameState.epoch} of 3
        </div>
        <div className="text-sm lg:text-base text-muted-foreground mt-2">
          Current Player: <span className="font-semibold text-primary">{gameState.players[gameState.currentPlayerIndex].name}</span>
        </div>
        {(selectedCastle || selectedTile) && (
          <div className="text-sm lg:text-base text-primary mt-3 font-medium bg-primary/10 p-2 lg:p-3 rounded-lg border border-primary/20">
            Click an empty space to place your {selectedCastle ? 'castle' : 'tile'}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;