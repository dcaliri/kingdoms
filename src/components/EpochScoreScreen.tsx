import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameState } from '@/types/game';
import { Trophy, Crown, Medal, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EpochScoreScreenProps {
  gameState: GameState;
  epochScores: { [playerId: string]: number };
  epochNumber: number;
  onContinue: () => void;
  isHost: boolean;
}

const EpochScoreScreen: React.FC<EpochScoreScreenProps> = ({ 
  gameState, 
  epochScores, 
  epochNumber,
  onContinue,
  isHost
}) => {
  // Sort players by epoch score (highest first)
  const sortedPlayers = [...gameState.players].sort((a, b) => 
    (epochScores[b.id] || 0) - (epochScores[a.id] || 0)
  );

  const getPositionIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="h-6 w-6 text-yellow-500" />;
      case 1: return <Medal className="h-6 w-6 text-gray-400" />;
      case 2: return <Award className="h-6 w-6 text-amber-600" />;
      default: return <Trophy className="h-6 w-6 text-gray-300" />;
    }
  };

  const getPositionText = (index: number) => {
    switch (index) {
      case 0: return '1st Place';
      case 1: return '2nd Place';
      case 2: return '3rd Place';
      default: return `${index + 1}th Place`;
    }
  };

  // Render board cell
  const renderBoardCell = (row: number, col: number) => {
    const cell = gameState.board[row][col];
    
    return (
      <div
        key={`${row}-${col}`}
        className="aspect-square border border-gray-300 flex items-center justify-center text-xs bg-white"
      >
        {cell && (
          <div className="w-full h-full flex flex-col items-center justify-center p-1">
            {'rank' in cell ? (
              // Castle
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm",
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
                "w-full h-full flex flex-col items-center justify-center rounded text-center text-xs",
                cell.type === 'resource' && "bg-green-200 text-green-800",
                cell.type === 'hazard' && "bg-red-200 text-red-800",
                cell.type === 'mountain' && "bg-gray-400 text-white",
                cell.type === 'dragon' && "bg-purple-500 text-white",
                cell.type === 'goldmine' && "bg-yellow-400 text-yellow-900",
                cell.type === 'wizard' && "bg-indigo-400 text-white"
              )}>
                <div className="text-xs leading-tight mb-1">
                  {cell.name}
                </div>
                {cell.value !== 0 && (
                  <div className="text-xs font-bold">
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

  // Calculate detailed scores for display using the same logic as main calculation
  const calculateDetailedScores = () => {
    const playerDetails: { [playerId: string]: { rows: number[], columns: number[], total: number } } = {};
    
    // Create color to player ID mapping
    const colorToPlayerId: { [color: string]: string } = {};
    gameState.players.forEach(player => {
      colorToPlayerId[player.color] = player.id;
      playerDetails[player.id] = {
        rows: new Array(5).fill(0),
        columns: new Array(6).fill(0),
        total: 0
      };
    });

    // Calculate row scores with proper mountain handling
    for (let row = 0; row < 5; row++) {
      const rowScores = calculateRowScore(gameState.board, row, colorToPlayerId);
      Object.entries(rowScores).forEach(([playerId, score]) => {
        if (playerDetails[playerId]) {
          playerDetails[playerId].rows[row] = score;
          playerDetails[playerId].total += score;
        }
      });
    }

    // Calculate column scores with proper mountain handling
    for (let col = 0; col < 6; col++) {
      const colScores = calculateColumnScore(gameState.board, col, colorToPlayerId);
      Object.entries(colScores).forEach(([playerId, score]) => {
        if (playerDetails[playerId]) {
          playerDetails[playerId].columns[col] = score;
          playerDetails[playerId].total += score;
        }
      });
    }

    return playerDetails;
  };

  // Row score calculation with mountain segment handling
  const calculateRowScore = (board: any[][], row: number, colorToPlayerId: { [color: string]: string }) => {
    const scores: { [playerId: string]: number } = {};
    const rowCells = board[row];
    
    // Find mountains to split the row
    const mountainIndices = rowCells
      .map((cell: any, index: number) => cell && 'type' in cell && cell.type === 'mountain' ? index : -1)
      .filter((index: number) => index !== -1);
    
    if (mountainIndices.length === 0) {
      // Score entire row
      return calculateSegmentScore(rowCells, colorToPlayerId);
    } else {
      // Score segments separated by mountains
      const segments: any[][] = [];
      let start = 0;
      
      mountainIndices.forEach((mountainIndex: number) => {
        if (start < mountainIndex) {
          segments.push(rowCells.slice(start, mountainIndex));
        }
        start = mountainIndex + 1;
      });
      
      if (start < rowCells.length) {
        segments.push(rowCells.slice(start));
      }
      
      segments.forEach((segment) => {
        const segmentScores = calculateSegmentScore(segment, colorToPlayerId);
        Object.entries(segmentScores).forEach(([playerId, score]) => {
          scores[playerId] = (scores[playerId] || 0) + score;
        });
      });
      
      return scores;
    }
  };

  // Column score calculation with mountain segment handling
  const calculateColumnScore = (board: any[][], col: number, colorToPlayerId: { [color: string]: string }) => {
    const scores: { [playerId: string]: number } = {};
    const colCells = board.map(row => row[col]);
    
    // Find mountains to split the column
    const mountainIndices = colCells
      .map((cell: any, index: number) => cell && 'type' in cell && cell.type === 'mountain' ? index : -1)
      .filter((index: number) => index !== -1);
    
    if (mountainIndices.length === 0) {
      // Score entire column
      return calculateSegmentScore(colCells, colorToPlayerId);
    } else {
      // Score segments separated by mountains
      const segments: any[][] = [];
      let start = 0;
      
      mountainIndices.forEach((mountainIndex: number) => {
        if (start < mountainIndex) {
          segments.push(colCells.slice(start, mountainIndex));
        }
        start = mountainIndex + 1;
      });
      
      if (start < colCells.length) {
        segments.push(colCells.slice(start));
      }
      
      segments.forEach((segment) => {
        const segmentScores = calculateSegmentScore(segment, colorToPlayerId);
        Object.entries(segmentScores).forEach(([playerId, score]) => {
          scores[playerId] = (scores[playerId] || 0) + score;
        });
      });
      
      return scores;
    }
  };

  // Segment score calculation
  const calculateSegmentScore = (segment: any[], colorToPlayerId: { [color: string]: string }) => {
    const scores: { [playerId: string]: number } = {};
    
    // Check for dragon - cancels all resource tiles
    const hasDragon = segment.some((cell: any) => cell && 'type' in cell && cell.type === 'dragon');
    
    // Check for gold mine - doubles all tile values
    const hasGoldMine = segment.some((cell: any) => cell && 'type' in cell && cell.type === 'goldmine');
    
    // Calculate base value from tiles
    let baseValue = 0;
    segment.forEach((cell: any) => {
      if (cell && 'type' in cell) {
        if (cell.type === 'resource' && !hasDragon) {
          baseValue += cell.value;
        } else if (cell.type === 'hazard') {
          baseValue += cell.value;
        }
      }
    });

    if (hasGoldMine) {
      baseValue *= 2;
    }

    // Calculate castle ranks for each player
    const playerCastleRanks: { [playerId: string]: number } = {};
    segment.forEach((cell: any) => {
      if (cell && 'rank' in cell) {
        const playerId = colorToPlayerId[cell.color];
        if (playerId) {
          playerCastleRanks[playerId] = (playerCastleRanks[playerId] || 0) + cell.rank;
        }
      }
    });

    // Calculate final scores
    Object.entries(playerCastleRanks).forEach(([playerId, totalRank]) => {
      scores[playerId] = baseValue * totalRank;
    });

    return scores;
  };

  const detailedScores = calculateDetailedScores();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-6xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 my-4">
        <CardHeader className="text-center bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
            <Trophy className="h-8 w-8" />
            Epoch {epochNumber} Results
            <Trophy className="h-8 w-8" />
          </CardTitle>
          <p className="text-yellow-100 text-lg">Points earned this epoch</p>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Player Rankings */}
          <div className="space-y-4 mb-8">
            {sortedPlayers.map((player, index) => (
              <div 
                key={player.id} 
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  index === 0 
                    ? 'bg-yellow-100 border-yellow-400 shadow-lg' 
                    : index === 1
                    ? 'bg-gray-50 border-gray-300'
                    : index === 2
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  {getPositionIcon(index)}
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full ${
                      player.color === 'red' ? 'bg-red-500' :
                      player.color === 'blue' ? 'bg-blue-500' :
                      player.color === 'yellow' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    <div>
                      <div className="font-bold text-lg">{player.name}</div>
                      <div className="text-sm text-gray-600">{getPositionText(index)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    index === 0 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    +{epochScores[player.id] || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total: {player.gold} gold
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Board Snapshot */}
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-center">Final Board State</h3>
            <div className="flex justify-center">
              <div className="grid grid-cols-6 gap-1 bg-gray-200 p-4 rounded-lg">
                {Array.from({ length: 5 }, (_, row) =>
                  Array.from({ length: 6 }, (_, col) => renderBoardCell(row, col))
                )}
              </div>
            </div>
          </div>

          {/* Detailed Score Calculations */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-center">Score Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gameState.players.map(player => (
                <div key={player.id} className="bg-white p-4 rounded-lg border border-gray-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-4 h-4 rounded-full ${
                      player.color === 'red' ? 'bg-red-500' :
                      player.color === 'blue' ? 'bg-blue-500' :
                      player.color === 'yellow' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    <h4 className="font-bold text-lg">{player.name}</h4>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Rows:</strong>
                      <div className="grid grid-cols-5 gap-1 mt-1">
                        {detailedScores[player.id]?.rows.map((score, index) => (
                          <div key={index} className={`text-center p-1 rounded text-xs ${
                            score > 0 ? 'bg-green-100 text-green-800' :
                            score < 0 ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            R{index + 1}: {score}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <strong>Columns:</strong>
                      <div className="grid grid-cols-6 gap-1 mt-1">
                        {detailedScores[player.id]?.columns.map((score, index) => (
                          <div key={index} className={`text-center p-1 rounded text-xs ${
                            score > 0 ? 'bg-green-100 text-green-800' :
                            score < 0 ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            C{index + 1}: {score}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <strong className="text-green-600">
                        Total: {epochScores[player.id] || 0} points
                      </strong>
                      <div className="text-xs text-gray-500 mt-1">
                        Calculated: {detailedScores[player.id]?.total || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Continue button - only host can continue */}
          <div className="text-center">
            {isHost ? (
              <Button 
                onClick={onContinue}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 text-lg font-semibold"
              >
                {epochNumber === 3 ? 'View Final Results' : `Start Epoch ${epochNumber + 1}`}
              </Button>
            ) : (
              <div className="text-center">
                <div className="text-gray-600 mb-2">Waiting for host to continue...</div>
                <div className="animate-pulse text-blue-600 font-semibold">
                  Host will start the next epoch
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EpochScoreScreen;