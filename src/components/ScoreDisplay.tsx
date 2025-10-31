import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameState } from '@/types/game';
import { calculateScore } from '@/utils/gameLogic';

interface ScoreDisplayProps {
  gameState: GameState;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ gameState }) => {
  const [showPotentialScores, setShowPotentialScores] = useState(false);
  const [keySequence, setKeySequence] = useState('');
  const [easterEggTimer, setEasterEggTimer] = useState<NodeJS.Timeout | null>(null);
  
  const currentScores = calculateScore(gameState);

  // Listen for keystrokes to detect the easter egg sequence
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only capture letters, ignore special keys
      if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
        const newSequence = (keySequence + event.key.toLowerCase()).slice(-7); // Keep only last 7 characters
        setKeySequence(newSequence);
        
        // Check if the sequence ends with 'megahit'
        if (newSequence.endsWith('megahit')) {
          console.log('🎉 Easter egg activated! Showing potential scores for 30 seconds');
          
          // Clear any existing timer
          if (easterEggTimer) {
            clearTimeout(easterEggTimer);
          }
          
          // Show potential scores
          setShowPotentialScores(true);
          
          // Set timer to hide after 30 seconds
          const timer = setTimeout(() => {
            setShowPotentialScores(false);
            console.log('⏰ Easter egg expired - hiding potential scores');
          }, 30000);
          
          setEasterEggTimer(timer);
          
          // Reset sequence
          setKeySequence('');
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyPress);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (easterEggTimer) {
        clearTimeout(easterEggTimer);
      }
    };
  }, [keySequence, easterEggTimer]);

  // Reset sequence after 5 seconds of inactivity
  useEffect(() => {
    if (keySequence.length > 0) {
      const resetTimer = setTimeout(() => {
        setKeySequence('');
      }, 5000);
      
      return () => clearTimeout(resetTimer);
    }
  }, [keySequence]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Current Scores
          {showPotentialScores && (
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded animate-pulse">
              🎯 Potential Scores Active
            </span>
          )}
        </CardTitle>
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
                {showPotentialScores && (
                  <div className="text-xs text-green-600 font-semibold animate-pulse">
                    Potential: +{currentScores[player.id] || 0}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-gray-500">
            {showPotentialScores ? (
              <div className="text-green-600 font-medium">
                🎉 Easter egg active! Showing potential epoch scores...
              </div>
            ) : (
              "Gold represents your total wealth accumulated across all epochs"
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreDisplay;