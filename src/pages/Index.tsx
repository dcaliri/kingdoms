import React, { useState, useEffect } from 'react';
import { Room } from '@/types/room';
import { GameState } from '@/types/game';
import HomePage from '@/components/HomePage';
import GameLobby from '@/components/GameLobby';
import GameBoard from '@/components/GameBoard';
import PlayerPanel from '@/components/PlayerPanel';
import GameActions from '@/components/GameActions';
import ScoreDisplay from '@/components/ScoreDisplay';
import { useGamePlay } from '@/hooks/useGamePlay';
import { supabase } from '@/integrations/supabase/client';

type AppState = 'home' | 'lobby' | 'playing';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('home');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  const {
    selectedCastle,
    selectedTile,
    hasSelectedStartingTile,
    setSelectedCastle,
    drawAndPlaceTile,
    handleCellClick,
    selectStartingTile,
    passTurn
  } = useGamePlay(gameState, playerId, room?.id || '', setGameState);

  // Set up real-time subscription for game state updates
  useEffect(() => {
    if (!room?.id || appState !== 'playing') return;

    console.log('=== SETTING UP GAME STATE SUBSCRIPTION ===');
    console.log('Room ID:', room.id);
    console.log('Player ID:', playerId);

    const channel = supabase
      .channel(`game-state-${room.id}-${playerId}`) // Make channel unique per player
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'games',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          console.log('=== GAME STATE REAL-TIME UPDATE ===');
          console.log('Event type:', payload.eventType);
          console.log('Player ID:', playerId);
          console.log('Full payload:', payload);
          
          if (payload.eventType === 'UPDATE' && payload.new && payload.new.game_state) {
            const updatedGameState = payload.new.game_state as GameState;
            console.log('=== UPDATING GAME STATE FROM REAL-TIME ===');
            console.log('Current player index:', updatedGameState.currentPlayerIndex);
            console.log('Current player:', updatedGameState.players[updatedGameState.currentPlayerIndex]?.name);
            console.log('Board state:', updatedGameState.board);
            setGameState(updatedGameState);
          } else if (payload.eventType === 'INSERT' && payload.new && payload.new.game_state) {
            // Handle initial game creation
            const newGameState = payload.new.game_state as GameState;
            console.log('=== NEW GAME STATE INSERTED ===');
            console.log('Game state:', newGameState);
            setGameState(newGameState);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('=== GAME STATE SUBSCRIPTION STATUS ===');
        console.log('Status:', status);
        console.log('Player ID:', playerId);
        if (err) {
          console.error('Subscription error:', err);
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to game state changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to game state changes');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('🔒 Subscription closed');
        }
      });

    return () => {
      console.log('=== CLEANING UP GAME STATE SUBSCRIPTION ===');
      console.log('Player ID:', playerId);
      supabase.removeChannel(channel);
    };
  }, [room?.id, appState, playerId]);

  const handleRoomJoined = (code: string, id: string) => {
    setRoomCode(code);
    setPlayerId(id);
    setAppState('lobby');
  };

  const handleGameStart = (roomData: Room, initialGameState: GameState) => {
    console.log('=== GAME START TRIGGERED ===');
    console.log('Room data:', roomData);
    console.log('Initial game state:', initialGameState);
    console.log('Player ID:', playerId);
    
    setRoom(roomData);
    setGameState(initialGameState);
    setAppState('playing');
  };

  const handleLeaveRoom = () => {
    setAppState('home');
    setRoomCode('');
    setPlayerId('');
    setRoom(null);
    setGameState(null);
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

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading game...</p>
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
  const ownPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = currentPlayer?.id === playerId;

  return (
    <div className="min-h-screen bg-gray-100 p-2">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
          
          {/* Turn Status */}
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
                isOwnPlayer={player.id === playerId}
                onCastleSelect={setSelectedCastle}
                onStartingTileSelect={selectStartingTile}
                selectedCastle={selectedCastle}
                hasSelectedStartingTile={hasSelectedStartingTile && player.id === playerId}
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