import React from 'react';
import { useKingdomsGame } from '@/hooks/useKingdomsGame';
import GameSetup from '@/components/GameSetup';
import GameBoard from '@/components/GameBoard';
import PlayerPanel from '@/components/PlayerPanel';
import GameActions from '@/components/GameActions';
import ScoreDisplay from '@/components/ScoreDisplay';

const Index = () => {
  const {
    gameState,
    selectedCastle,
    selectedTile,
    hasSelectedStartingTile,
    initializeGame,
    setSelectedCastle,
    drawAndPlaceTile,
    handleCellClick,
    selectStartingTile,
    passTurn
  } = useKingdomsGame();

  if (!gameState) {
    return <GameSetup onStartGame={initializeGame} />;
  }

  if (gameState.gamePhase === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-4">Game Over!</h1>
          <h2 className="text-2xl text-yellow-600 mb-6">
            🏆 {gameState.winner?.name} Wins! 🏆
          </h2>
          <div className="space-y-2 mb-6">
            {gameState.players
              .sort((a, b) => b.gold - a.gold)
              .map((player, index) => (
                <div key={player.id} className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
                    <span>{player.name}</span>
                  </span>
                  <span className="font-bold text-yellow-600">{player.gold} Gold</span>
                </div>
              ))}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Kingdoms</h1>
          <p className="text-gray-600">
            Epoch {gameState.epoch} of 3 • {currentPlayer.name}'s Turn
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Players */}
          <div className="space-y-4">
            {gameState.players.map(player => (
              <PlayerPanel
                key={player.id}
                player={player}
                isCurrentPlayer={player.id === currentPlayer.id}
                onCastleSelect={setSelectedCastle}
                onStartingTileSelect={selectStartingTile}
                selectedCastle={selectedCastle}
                hasSelectedStartingTile={hasSelectedStartingTile && player.id === currentPlayer.id}
              />
            ))}
          </div>

          {/* Center Column - Game Board */}
          <div className="flex justify-center">
            <GameBoard
              gameState={gameState}
              onCellClick={handleCellClick}
              selectedCastle={selectedCastle}
              selectedTile={selectedTile}
            />
          </div>

          {/* Right Column - Actions and Scores */}
          <div className="space-y-4">
            <GameActions
              gameState={gameState}
              currentPlayer={currentPlayer}
              onDrawTile={drawAndPlaceTile}
              onPass={passTurn}
              selectedCastle={selectedCastle}
              selectedTile={selectedTile}
              hasSelectedStartingTile={hasSelectedStartingTile}
            />
            <ScoreDisplay gameState={gameState} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;