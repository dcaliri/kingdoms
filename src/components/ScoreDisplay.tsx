import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameState } from '@/types/game';
import { calculateScore } from '@/utils/gameLogic';

interface ScoreDisplayProps {
  gameState: GameState;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ gameState }) => {
  const currentScores = calculateScore(gameState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Current Scores</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {gameState.players.map(player => (
            <div key={player.id} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  player.color === 'red' ? 'bg-red-500' :
                  player.color === 'blue' ? 'bg-blue-500' :
                  player.color === 'yellow' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`} />
                <span className="text-sm font-medium">{player.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-yellow-600">
                  {player.gold} Gold
                </div>
                <div className="text-xs text-gray-500">
                  Potential: {currentScores[player.id] || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-gray-500">
            Potential scores show what players would earn if the epoch ended now
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreDisplay;