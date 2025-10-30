import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameState } from '@/types/game';
import { calculateScore } from '@/utils/gameLogic';

interface EpochScoreDisplayProps {
  gameState: GameState;
  epochScores: { [playerId: string]: number };
  epochNumber: number;
}

const EpochScoreDisplay: React.FC<EpochScoreDisplayProps> = ({ 
  gameState, 
  epochScores, 
  epochNumber 
}) => {
  return (
    <Card className="border-2 border-yellow-400 bg-yellow-50">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold text-yellow-800">
          🏆 Epoch {epochNumber} Results 🏆
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {gameState.players
            .sort((a, b) => (epochScores[b.id] || 0) - (epochScores[a.id] || 0))
            .map((player, index) => (
              <div 
                key={player.id} 
                className={`flex justify-between items-center p-3 rounded-lg ${
                  index === 0 ? 'bg-yellow-200 border-2 border-yellow-400' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                  </span>
                  <div className={`w-4 h-4 rounded-full ${
                    player.color === 'red' ? 'bg-red-500' :
                    player.color === 'blue' ? 'bg-blue-500' :
                    player.color === 'yellow' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                  <span className="font-semibold">{player.name}</span>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    +{epochScores[player.id] || 0} points
                  </div>
                  <div className="text-sm text-gray-600">
                    Total: {player.gold} gold
                  </div>
                </div>
              </div>
            ))}
        </div>
        
        <div className="mt-4 pt-4 border-t text-center text-sm text-gray-600">
          Points are calculated from rows and columns containing your castles
        </div>
      </CardContent>
    </Card>
  );
};

export default EpochScoreDisplay;