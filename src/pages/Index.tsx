import React, { useState } from 'react';
import { useKingdomsGame } from '@/hooks/useKingdomsGame';
import { Room } from '@/types/room';
import HomePage from '@/components/HomePage';
import GameLobby from '@/components/GameLobby';
import GameBoard from '@/components/GameBoard';
import PlayerPanel from '@/components/PlayerPanel';
import GameActions from '@/components/GameActions';
import ScoreDisplay from '@/components/ScoreDisplay';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

type AppState = 'home' | 'lobby' | 'playing';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('home');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [room, setRoom] = useState<Room | null>(null);

  const {
    gameState,
    currentPlayerId,
    selectedCastle,
    selectedTile,
    hasSelectedStartingTile,
    isInitializing,
    initializeGameFromRoom,
    setSelectedCastle,
    drawAndPlaceTile,
    handleCellClick,
    selectStartingTile,
    passTurn
  } = useKingdomsGame();

  const handleRoomJoined = (code: string, id: string) => {
    setRoomCode(code);
    setPlayerId(id);
    setAppState('lobby');
  };

  const handleGameStart = (roomData: Room) => {
    setRoom(roomData);
    initializeGameFromRoom(roomData, playerId);
    setAppState('playing');
  };

  const handleLeaveRoom = () => {
    setAppState('home');
    setRoomCode('');
    setPlayerId('');
    setRoom(null);
  };

  const handleManualRefresh = () => {
    if (room) {
      console.log('Manual refresh triggered');
      initializeGameFromRoom(room, playerId);
    }
  };

  if (appState === 'home') {
    return <HomePage onRoomJoined={handleRoomJoined} />;
  }

  if (appState === 'lobby') {
    return (
      <GameLobby
        roomCode={roomCode}
        playerId={playerId}
        onGameStart={handleGameStart}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  if (isInitializing || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Game...</h2>
          <p className="text-gray-600 mb-4">
            {isInitializing ? 'Initializing game state...' : 'Waiting for game data...'}
          </p>
          
          <div className="text-sm text-gray-500 space-y-1 mb-4">
            <div>Room: {roomCode}</div>
            <div>Player ID: {playerId}</div>
            <div>Status: {isInitializing ? 'Initializing' : 'Waiting'}</div>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleManualRefresh}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Loading
            </Button>
            
            <Button 
              onClick={handleLeaveRoom}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              Back to Lobby
            </Button>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            If this persists, try refreshing the page
          </div>
        </div>
      </div>
    );
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
  const ownPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const isMyTurn = currentPlayer?.id === currentPlayerId;

  return (
    <div className="min-h-screen bg-gray-100 p-2">
      <div className="max-w-7xl mx-auto">
        {/* Header - Enhanced with turn status */}
        <div className="text-center mb-3">
          <h1 className="text-2xl font-bold mb-1">Kingdoms</h1>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-gray-600">
              Epoch {gameState.epoch} of 3
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">
              Room: {roomCode}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-blue-600">
              You are: {ownPlayer?.name}
            </span>
          </div>
          
          {/* Turn Status - More prominent */}
          <div className={`mt-2 p-3 rounded-lg ${
            isMyTurn 
              ? 'bg-green-100 border border-green-300' 
              : 'bg-gray-100 border border-gray-300'
          }`}>
            {isMyTurn ? (
              <div className="text-green-800 font-semibold">
                🎯 It's YOUR turn! Make your move.
              </div>
            ) : (
              <div className="text-gray-700">
                ⏳ Waiting for <span className="font-semibold">{currentPlayer?.name}</span>'s turn
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Left Column - Players */}
          <div className="lg:col-span-1 space-y-2">
            {gameState.players.map(player => (
              <PlayerPanel
                key={player.id}
                player={player}
                isCurrentPlayer={player.id === currentPlayer.id}
                isOwnPlayer={player.id === currentPlayerId}
                onCastleSelect={setSelectedCastle}
                onStartingTileSelect={selectStartingTile}
                selectedCastle={selectedCastle}
                hasSelectedStartingTile={hasSelectedStartingTile && player.id === currentPlayerId}
              />
            ))}
          </div>

          {/* Center Column - Game Board */}
          <div className="lg:col-span-2 flex justify-center">
            <div className="w-full max-w-2xl">
              <GameBoard
                gameState={gameState}
                onCellClick={handleCellClick}
                selectedCastle={selectedCastle}
                selectedTile={selectedTile}
              />
            </div>
          </div>

          {/* Right Column - Actions and Scores */}
          <div className="lg:col-span-1 space-y-3">
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