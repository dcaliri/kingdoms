import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameState } from '@/types/game';
import { Trophy, Crown, Medal, Award } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400">
        <CardHeader className="text-center bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
            <Trophy className="h-8 w-8" />
            Epoch {epochNumber} Results
            <Trophy className="h-8 w-8" />
          </CardTitle>
          <p className="text-yellow-100 text-lg">Points earned this epoch</p>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-4 mb-6">
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

          {/* Scoring explanation */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">How Scoring Works:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Points are calculated from rows and columns containing your castles</li>
              <li>• Castle rank multiplies the row/column value</li>
              <li>• Dragons cancel resource tiles, Gold mines double values</li>
              <li>• Mountains split rows/columns into separate segments</li>
            </ul>
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