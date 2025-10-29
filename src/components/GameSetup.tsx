import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Minus } from 'lucide-react';

interface GameSetupProps {
  onStartGame: (playerNames: string[]) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame }) => {
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2']);

  const updatePlayerCount = (newCount: number) => {
    if (newCount < 2 || newCount > 4) return;
    
    setPlayerCount(newCount);
    
    const newNames = [...playerNames];
    if (newCount > playerNames.length) {
      // Add new players
      for (let i = playerNames.length; i < newCount; i++) {
        newNames.push(`Player ${i + 1}`);
      }
    } else {
      // Remove excess players
      newNames.splice(newCount);
    }
    setPlayerNames(newNames);
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleStartGame = () => {
    const validNames = playerNames.filter(name => name.trim().length > 0);
    if (validNames.length !== playerCount) {
      alert('Please enter names for all players');
      return;
    }
    onStartGame(validNames);
  };

  const colors = ['red', 'blue', 'yellow', 'green'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Kingdoms</CardTitle>
          <p className="text-gray-600">Set up your game</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Player Count */}
          <div className="space-y-2">
            <Label>Number of Players</Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePlayerCount(playerCount - 1)}
                disabled={playerCount <= 2}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-xl font-bold w-8 text-center">{playerCount}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePlayerCount(playerCount + 1)}
                disabled={playerCount >= 4}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Player Names */}
          <div className="space-y-3">
            <Label>Player Names</Label>
            {playerNames.map((name, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${
                  colors[index] === 'red' ? 'bg-red-500' :
                  colors[index] === 'blue' ? 'bg-blue-500' :
                  colors[index] === 'yellow' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`} />
                <Input
                  value={name}
                  onChange={(e) => updatePlayerName(index, e.target.value)}
                  placeholder={`Player ${index + 1}`}
                  className="flex-1"
                />
              </div>
            ))}
          </div>

          {/* Game Rules Summary */}
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <h4 className="font-semibold mb-2">Quick Rules:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Place castles and tiles on the board</li>
              <li>• Score points from rows and columns</li>
              <li>• Game lasts 3 epochs</li>
              <li>• Most gold wins!</li>
            </ul>
          </div>

          <Button onClick={handleStartGame} className="w-full" size="lg">
            Start Game
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameSetup;